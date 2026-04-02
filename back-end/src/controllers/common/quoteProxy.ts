import type { Request } from "express";
import { request } from "node:http";
import { env } from "node:process";
import { Router } from "express";

interface NormalizedQuote {
	_id: string;
	content: string;
	author: string;
	tags: string[];
	authorSlug: string;
	length: number;
	dateAdded: string;
	dateModified: string;
}

const DEFAULT_QUOTES_UPSTREAM_URL = "https://jacobdanderson.net/quotes-api";
const DEFAULT_QUOTES_REQUEST_PATH = "/quotes";
const AUTHOR_WHITESPACE_PATTERN = /\s+/g;
const TRAILING_SLASHES_PATTERN = /\/+$/;
const LEADING_SLASHES_PATTERN = /^\/+/;
const DUPLICATE_SLASHES_PATTERN = /\/{2,}/g;

function normalizeTags(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
	}

	if (typeof value === "string") {
		return value
			.split(",")
			.map(tag => tag.trim())
			.filter(Boolean);
	}

	return [];
}

function slugifyAuthor(author: string): string {
	return author.replace(AUTHOR_WHITESPACE_PATTERN, "-").toLowerCase();
}

function normalizeQuote(payload: unknown): NormalizedQuote | null {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const quote = payload as Record<string, unknown>;
	const content = typeof quote.content === "string"
		? quote.content.trim()
		: typeof quote.body === "string"
			? quote.body.trim()
			: "";

	if (!content) {
		return null;
	}

	const author = typeof quote.author === "string" && quote.author.trim()
		? quote.author.trim()
		: "Unknown";
	const now = new Date().toISOString();
	const idSource = quote._id ?? quote.id ?? `${author}-${content.slice(0, 32)}`;

	return {
		_id: String(idSource),
		content,
		author,
		tags: normalizeTags(quote.tags),
		authorSlug: typeof quote.authorSlug === "string" && quote.authorSlug.trim()
			? quote.authorSlug
			: slugifyAuthor(author),
		length: typeof quote.length === "number" && Number.isFinite(quote.length)
			? quote.length
			: content.length,
		dateAdded: typeof quote.dateAdded === "string" ? quote.dateAdded : now,
		dateModified: typeof quote.dateModified === "string" ? quote.dateModified : now
	};
}

export function normalizeQuotesPayload(payload: unknown): NormalizedQuote[] {
	if (Array.isArray(payload)) {
		return payload
			.map(normalizeQuote)
			.filter((quote): quote is NormalizedQuote => quote !== null);
	}

	if (!payload || typeof payload !== "object") {
		return [];
	}

	const data = payload as Record<string, unknown>;
	if (Array.isArray(data.quotes)) {
		return data.quotes
			.map(normalizeQuote)
			.filter((quote): quote is NormalizedQuote => quote !== null);
	}

	if ("quote" in data) {
		const quote = normalizeQuote(data.quote);
		return quote ? [quote] : [];
	}

	const quote = normalizeQuote(data);
	return quote ? [quote] : [];
}

function appendQueryParams(searchParams: URLSearchParams, req: Request) {
	for (const [key, rawValue] of Object.entries(req.query)) {
		searchParams.delete(key);

		if (Array.isArray(rawValue)) {
			for (const value of rawValue) {
				if (typeof value === "string") {
					searchParams.append(key, value);
				}
			}
			continue;
		}

		if (typeof rawValue === "string") {
			searchParams.set(key, rawValue);
		}
	}
}

export function buildQuotesRequestPath(req: Request): string {
	const searchParams = new URLSearchParams();
	appendQueryParams(searchParams, req);
	const queryString = searchParams.toString();
	return queryString ? `${DEFAULT_QUOTES_REQUEST_PATH}?${queryString}` : DEFAULT_QUOTES_REQUEST_PATH;
}

function joinUpstreamPath(basePathname: string, requestPathname: string): string {
	const normalizedBasePath = basePathname === "/"
		? ""
		: basePathname.replace(TRAILING_SLASHES_PATTERN, "");
	const normalizedRequestPath = requestPathname.replace(LEADING_SLASHES_PATTERN, "");

	if (!normalizedRequestPath) {
		return normalizedBasePath || "/";
	}

	if (normalizedBasePath.endsWith(`/${normalizedRequestPath}`) || normalizedBasePath === `/${normalizedRequestPath}`) {
		return normalizedBasePath || `/${normalizedRequestPath}`;
	}

	return `${normalizedBasePath}/${normalizedRequestPath}`.replace(DUPLICATE_SLASHES_PATTERN, "/");
}

export function resolveQuotesUpstreamUrl(requestPath: string): URL {
	const baseUrl = new URL(env.QUOTES_UPSTREAM_URL || DEFAULT_QUOTES_UPSTREAM_URL);
	const requestUrl = new URL(requestPath, "http://quotes.local");
	const mergedSearchParams = new URLSearchParams(baseUrl.search);

	baseUrl.pathname = joinUpstreamPath(baseUrl.pathname, requestUrl.pathname);
	for (const [key, value] of requestUrl.searchParams.entries()) {
		mergedSearchParams.append(key, value);
	}
	baseUrl.search = mergedSearchParams.toString();

	return baseUrl;
}

function readResponseBody(stream: NodeJS.ReadableStream): Promise<string> {
	return new Promise((resolve, reject) => {
		let body = "";
		stream.setEncoding("utf8");
		stream.on("data", (chunk) => {
			body += chunk;
		});
		stream.on("end", () => resolve(body));
		stream.on("error", reject);
	});
}

interface UpstreamResponse {
	status: number;
	body: string;
	transport: "socket" | "url";
	target: string;
}

export function fetchQuotesViaSocket(path: string, socketPath: string): Promise<UpstreamResponse> {
	return new Promise((resolve, reject) => {
		const req = request(
			{
				socketPath,
				path,
				method: "GET",
				headers: {
					accept: "application/json",
					host: "localhost"
				}
			},
			async (res) => {
				try {
					const body = await readResponseBody(res);
					resolve({
						status: res.statusCode ?? 502,
						body,
						transport: "socket",
						target: socketPath
					});
				}
				catch (error) {
					reject(error);
				}
			}
		);

		req.on("error", reject);
		req.end();
	});
}

export async function fetchQuotesViaHttp(url: URL): Promise<UpstreamResponse> {
	const response = await fetch(url, {
		headers: {
			accept: "application/json"
		}
	});

	return {
		status: response.status,
		body: await response.text(),
		transport: "url",
		target: url.toString()
	};
}

export async function fetchQuotesUpstream(req: Request): Promise<UpstreamResponse> {
	const requestPath = buildQuotesRequestPath(req);
	const socketPath = env.QUOTES_UPSTREAM_SOCKET_PATH;

	if (socketPath) {
		try {
			return await fetchQuotesViaSocket(requestPath, socketPath);
		}
		catch (error) {
			console.error(`quotes proxy socket request failed: socket=${socketPath} path=${requestPath}`, error);
		}
	}

	const upstreamUrl = resolveQuotesUpstreamUrl(requestPath);

	try {
		return await fetchQuotesViaHttp(upstreamUrl);
	}
	catch (error) {
		console.error(`quotes proxy url request failed: url=${upstreamUrl.toString()}`, error);
		throw error;
	}
}

export const quoteProxy = Router().get("/", async (req, res) => {
	let upstreamResponse: UpstreamResponse;

	try {
		upstreamResponse = await fetchQuotesUpstream(req);
	}
	catch (err) {
		console.error("quotes proxy failed: transport=socket-or-url", err);
		return res.status(502).json({ error: "Unable to reach quotes service" });
	}

	if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
		return res.status(upstreamResponse.status).json({ error: upstreamResponse.body });
	}

	try {
		const quotes = normalizeQuotesPayload(JSON.parse(upstreamResponse.body));
		if (!quotes.length) {
			return res.status(502).json({ error: "Quotes service returned no usable quotes" });
		}

		return res.json(quotes);
	}
	catch (err) {
		console.error(`quotes proxy returned invalid payload: transport=${upstreamResponse.transport} target=${upstreamResponse.target}`, err);
		return res.status(502).json({ error: "Unable to reach quotes service" });
	}
});
