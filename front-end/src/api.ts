import axios, { CanceledError } from "axios";

declare module "axios" {
	interface InternalAxiosRequestConfig {
		_sessionEpoch?: number;
	}
}
export const api = axios.create({ baseURL: "/api", withCredentials: true, timeout: 10_000 });
const csrfClient = axios.create({ baseURL: "/api", withCredentials: true, timeout: 10_000 });
let epoch = 0;
let reads = new AbortController();
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let csrfController: AbortController | null = null;
let csrfEpoch = 0;

async function getCsrfToken(): Promise<string> {
	if (csrfToken) return csrfToken;
	if (!csrfRequest) {
		const generation = csrfEpoch;
		const controller = new AbortController();
		csrfController = controller;
		const pending = csrfClient
			.get<{ csrfToken: string }>("/accounts/csrf", { signal: controller.signal })
			.then(({ data }) => {
				if (generation !== csrfEpoch) throw new CanceledError("Session changed");
				csrfToken = data.csrfToken;
				return data.csrfToken;
			})
			.finally(() => {
				if (csrfRequest === pending) {
					csrfRequest = null;
					csrfController = null;
				}
			});
		csrfRequest = pending;
	}
	return csrfRequest;
}
export function clearCsrfToken() {
	csrfEpoch++;
	csrfController?.abort();
	csrfController = null;
	csrfToken = null;
	csrfRequest = null;
}
export function resetApiSession() {
	epoch++;
	reads.abort();
	reads = new AbortController();
	clearCsrfToken();
}
api.interceptors.request.use(async (config) => {
	config._sessionEpoch ??= epoch;
	if (config._sessionEpoch !== epoch) throw new CanceledError("Session changed");
	const method = config.method?.toUpperCase() || "GET";
	if (["GET", "HEAD", "OPTIONS"].includes(method)) {
		config.signal = config.signal ? AbortSignal.any([config.signal as AbortSignal, reads.signal]) : reads.signal;
	} else {
		config.headers.set("X-CSRF-Token", await getCsrfToken());
		if (config._sessionEpoch !== epoch) throw new CanceledError("Session changed");
	}
	return config;
});
api.interceptors.response.use(
	(response) => {
		if (response.config._sessionEpoch !== epoch) throw new CanceledError("Session changed");
		const replacement = response.headers["x-csrf-token"];
		if (typeof replacement === "string" && replacement) csrfToken = replacement;
		return response;
	},
	async (error) => {
		const request = error.config as (typeof error.config & { _csrfRetried?: boolean }) | undefined;
		if (request && request._sessionEpoch !== epoch) throw new CanceledError("Session changed");
		const method = request?.method?.toUpperCase() || "GET";
		const rejectedBeforeMutation =
			error.response?.status === 403 &&
			error.response?.data?.error === "request_rejected" &&
			!["GET", "HEAD", "OPTIONS"].includes(method);
		if (request && rejectedBeforeMutation && !request._csrfRetried) {
			request._csrfRetried = true;
			clearCsrfToken();
			return api.request(request);
		}
		return Promise.reject(error);
	}
);
