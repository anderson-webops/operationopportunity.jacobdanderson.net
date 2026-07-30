// src/api.ts
import axios from "axios";

export const api = axios.create({
	baseURL: "/api",
	withCredentials: true,
	timeout: 10_000
});

const csrfClient = axios.create({
	baseURL: "/api",
	withCredentials: true,
	timeout: 10_000
});
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

async function getCsrfToken(): Promise<string> {
	if (csrfToken) return csrfToken;
	if (!csrfRequest) {
		csrfRequest = csrfClient
			.get<{ csrfToken: string }>("/accounts/csrf")
			.then(({ data }) => {
				csrfToken = data.csrfToken;
				return data.csrfToken;
			})
			.finally(() => {
				csrfRequest = null;
			});
	}
	return csrfRequest;
}

export function clearCsrfToken() {
	csrfToken = null;
	csrfRequest = null;
}

api.interceptors.request.use(async (config) => {
	const method = config.method?.toUpperCase() || "GET";
	if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
		config.headers.set("X-CSRF-Token", await getCsrfToken());
	}
	return config;
});

api.interceptors.response.use(
	(response) => {
		const replacement = response.headers["x-csrf-token"];
		if (typeof replacement === "string" && replacement) csrfToken = replacement;
		return response;
	},
	async (error) => {
		const request = error.config as (typeof error.config & { _csrfRetried?: boolean }) | undefined;
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
