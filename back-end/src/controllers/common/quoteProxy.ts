import type { Request } from "express";
import type { IncomingMessage } from "node:http";
import type { AppConfig } from "../../config.js";
import { Buffer } from "node:buffer";
import { request } from "node:http";
import { Router } from "express";
import { HttpError, safeErrorSummary } from "../../errors.js";
import { trackHandler } from "../../runtimeCapacity.js";
import { serviceLog } from "../../serviceLog.js";

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

type QuotesConfig = Pick<AppConfig, "quotesUpstreamSocketPath" | "quotesUpstreamUrl">;

interface UpstreamResponse {
	status: number;
	body: string;
	retryAfter?: string;
}

const DEFAULT_QUOTES_REQUEST_PATH = "/quotes";
const MAX_UPSTREAM_BODY_BYTES = 1024 * 1024;
const SOCKET_TIMEOUT_MS = 2_000;
const HTTP_TIMEOUT_MS = 5_000;
const ALLOWED_QUERY_KEYS = ["author", "limit", "random", "search", "tags"] as const;
const AUTHOR_WHITESPACE_PATTERN = /\s+/g;
const TRAILING_SLASHES_PATTERN = /\/+$/;
const LEADING_SLASHES_PATTERN = /^\/+/;
const DUPLICATE_SLASHES_PATTERN = /\/{2,}/g;

function normalizeTags(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value
			.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
			.map((tag) => tag.trim().slice(0, 100));
	}
	if (typeof value === "string") {
		return value
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean)
			.map((tag) => tag.slice(0, 100));
	}
	return [];
}

function slugifyAuthor(author: string): string {
	return author.replace(AUTHOR_WHITESPACE_PATTERN, "-").toLowerCase();
}

function hasControlCharacter(value: string): boolean {
	for (const character of value) {
		const code = character.codePointAt(0) ?? 0;
		if (code < 32 || code === 127) return true;
	}
	return false;
}

function normalizeQuote(payload: unknown): NormalizedQuote | null {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
	const quote = payload as Record<string, unknown>;
	const content =
		typeof quote.content === "string"
			? quote.content.trim()
			: typeof quote.body === "string"
				? quote.body.trim()
				: "";
	if (!content || content.length > 10_000) return null;

	const author =
		typeof quote.author === "string" && quote.author.trim() ? quote.author.trim().slice(0, 200) : "Unknown";
	const now = new Date().toISOString();
	const idSource = quote._id ?? quote.id ?? `${author}-${content.slice(0, 32)}`;
	return {
		_id: (typeof idSource === "string" || typeof idSource === "number"
			? String(idSource)
			: slugifyAuthor(author)
		).slice(0, 200),
		content,
		author,
		tags: normalizeTags(quote.tags).slice(0, 20),
		authorSlug:
			typeof quote.authorSlug === "string" && quote.authorSlug.trim()
				? quote.authorSlug.slice(0, 200)
				: slugifyAuthor(author),
		length: typeof quote.length === "number" && Number.isFinite(quote.length) ? quote.length : content.length,
		dateAdded: typeof quote.dateAdded === "string" ? quote.dateAdded.slice(0, 64) : now,
		dateModified: typeof quote.dateModified === "string" ? quote.dateModified.slice(0, 64) : now
	};
}

function quoteCandidates(payload: unknown): unknown[] {
	return Array.isArray(payload)
		? payload
		: payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).quotes)
			? (payload as { quotes: unknown[] }).quotes
			: payload && typeof payload === "object" && "quote" in payload
				? [(payload as Record<string, unknown>).quote]
				: [payload];
}

export function normalizeQuotesPayload(payload: unknown): NormalizedQuote[] {
	return quoteCandidates(payload)
		.map(normalizeQuote)
		.filter((quote): quote is NormalizedQuote => quote !== null)
		.slice(0, 100);
}

export function buildQuotesRequestPath(req: Request): string {
	const searchParams = new URLSearchParams();
	for (const key of ALLOWED_QUERY_KEYS) {
		const value = req.query[key];
		if (value === undefined) continue;
		const invalid = () => new HttpError(400, "invalid_quote_query", `Invalid ${key} filter.`);
		if (typeof value !== "string" || value.length > 200 || hasControlCharacter(value)) throw invalid();
		const normalized = value.trim();
		if (!normalized) continue;
		if (key === "limit") {
			if (!/^\d{1,3}$/.test(normalized) || Number(normalized) < 1 || Number(normalized) > 100) throw invalid();
			searchParams.set(key, String(Number(normalized)));
			continue;
		}
		if (key === "random" && normalized !== "true" && normalized !== "false") throw invalid();
		if (key === "tags") {
			const tags = [
				...new Set(
					normalized
						.split(",")
						.map((tag) => tag.trim().toLowerCase())
						.filter(Boolean)
				)
			];
			if (tags.length > 20 || tags.some((tag) => tag.length > 50)) throw invalid();
			if (tags.length) searchParams.set(key, tags.join(","));
			continue;
		}
		searchParams.set(key, normalized);
	}
	const queryString = searchParams.toString();
	return queryString ? `${DEFAULT_QUOTES_REQUEST_PATH}?${queryString}` : DEFAULT_QUOTES_REQUEST_PATH;
}

function joinUpstreamPath(basePathname: string, requestPathname: string): string {
	const normalizedBasePath = basePathname === "/" ? "" : basePathname.replace(TRAILING_SLASHES_PATTERN, "");
	const normalizedRequestPath = requestPathname.replace(LEADING_SLASHES_PATTERN, "");
	if (!normalizedRequestPath) return normalizedBasePath || "/";
	if (
		normalizedBasePath.endsWith(`/${normalizedRequestPath}`) ||
		normalizedBasePath === `/${normalizedRequestPath}`
	) {
		return normalizedBasePath || `/${normalizedRequestPath}`;
	}
	return `${normalizedBasePath}/${normalizedRequestPath}`.replace(DUPLICATE_SLASHES_PATTERN, "/");
}

export function resolveQuotesUpstreamUrl(base: URL, requestPath: string): URL {
	const baseUrl = new URL(base);
	const requestUrl = new URL(requestPath, "http://quotes.local");
	const mergedSearchParams = new URLSearchParams(baseUrl.search);
	baseUrl.pathname = joinUpstreamPath(baseUrl.pathname, requestUrl.pathname);
	for (const [key, value] of requestUrl.searchParams) mergedSearchParams.set(key, value);
	baseUrl.search = mergedSearchParams.toString();
	return baseUrl;
}

async function readResponseBody(stream: IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	let size = 0;
	try {
		for await (const chunk of stream) {
			const bytes = Buffer.from(chunk);
			size += bytes.length;
			if (size > MAX_UPSTREAM_BODY_BYTES) throw new Error("Quotes response exceeds the configured limit");
			chunks.push(bytes);
		}
		return Buffer.concat(chunks, size).toString("utf8");
	} finally {
		stream.destroy();
	}
}

export function fetchQuotesViaSocket(
	path: string,
	socketPath: string,
	signal?: AbortSignal
): Promise<UpstreamResponse> {
	return new Promise((resolve, reject) => {
		const deadline = AbortSignal.timeout(SOCKET_TIMEOUT_MS);
		const upstreamRequest = request(
			{
				socketPath,
				path,
				method: "GET",
				headers: { accept: "application/json", host: "localhost" },
				signal: signal ? AbortSignal.any([signal, deadline]) : deadline
			},
			async (response) => {
				try {
					const status = response.statusCode ?? 502;
					if (status < 200 || status >= 300) {
						response.destroy();
						resolve({ status, body: "", retryAfter: response.headers["retry-after"] });
						return;
					}
					resolve({
						status,
						body: await readResponseBody(response),
						retryAfter: response.headers["retry-after"]
					});
				} catch (error) {
					reject(error);
				}
			}
		);
		upstreamRequest.on("error", reject);
		upstreamRequest.end();
	});
}

export async function fetchQuotesViaHttp(url: URL, signal?: AbortSignal): Promise<UpstreamResponse> {
	const deadline = AbortSignal.timeout(HTTP_TIMEOUT_MS);
	const response = await fetch(url, {
		headers: { accept: "application/json" },
		redirect: "error",
		signal: signal ? AbortSignal.any([signal, deadline]) : deadline
	});
	if (!response.ok) {
		await response.body?.cancel();
		return { status: response.status, body: "", retryAfter: response.headers.get("retry-after") ?? undefined };
	}
	const declaredLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredLength) && declaredLength > MAX_UPSTREAM_BODY_BYTES) {
		await response.body?.cancel();
		throw new Error("Quotes response exceeds the configured limit");
	}
	if (!response.body) throw new Error("Quotes service returned an empty response");
	const reader = response.body.getReader();
	const chunks: Buffer[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_UPSTREAM_BODY_BYTES) throw new Error("Quotes response exceeds the configured limit");
			chunks.push(Buffer.from(value));
		}
	} finally {
		try {
			await reader.cancel();
		} finally {
			reader.releaseLock();
		}
	}
	return {
		status: response.status,
		body: Buffer.concat(chunks, size).toString("utf8"),
		retryAfter: response.headers.get("retry-after") ?? undefined
	};
}

function parseUpstream(response: UpstreamResponse): NormalizedQuote[] {
	if (response.status < 200 || response.status >= 300) throw new Error("Quotes service returned an error");
	const payload: unknown = JSON.parse(response.body);
	const quotes = normalizeQuotesPayload(payload);
	// An empty collection is a valid filter result. Unusable nonempty data is an upstream failure.
	if (!quotes.length && quoteCandidates(payload).length) throw new Error("Quotes service returned invalid data");
	return quotes;
}

function upstreamRejection(response: UpstreamResponse): boolean {
	return response.status === 400 || response.status === 429;
}

async function fetchQuotesUpstream(req: Request, config: QuotesConfig, signal: AbortSignal): Promise<UpstreamResponse> {
	const requestPath = buildQuotesRequestPath(req);
	if (config.quotesUpstreamSocketPath) {
		try {
			const response = await fetchQuotesViaSocket(requestPath, config.quotesUpstreamSocketPath, signal);
			if (!upstreamRejection(response)) parseUpstream(response);
			return response;
		} catch (error) {
			signal.throwIfAborted();
			serviceLog.write({
				level: "error",
				message: "Quotes socket request failed",
				requestId: req.requestId,
				error: safeErrorSummary(error)
			});
		}
	}
	signal.throwIfAborted();
	return fetchQuotesViaHttp(resolveQuotesUpstreamUrl(config.quotesUpstreamUrl, requestPath), signal);
}

export function createQuoteProxy(config: QuotesConfig): Router {
	return Router().get(
		"/",
		trackHandler(async (req, res) => {
			const controller = new AbortController();
			const cancel = () => controller.abort();
			res.once("close", cancel);
			res.setHeader("Cache-Control", "no-store");
			try {
				const upstream = await fetchQuotesUpstream(req, config, controller.signal);
				if (upstream.status === 429) {
					// Quotes API uses delta-seconds. Never reflect arbitrary upstream header content.
					if (upstream.retryAfter && /^\d{1,6}$/.test(upstream.retryAfter)) {
						res.setHeader("Retry-After", upstream.retryAfter);
					}
					return res.status(429).json({ error: "quotes_rate_limited" });
				}
				if (upstream.status === 400) return res.status(400).json({ error: "invalid_quote_query" });
				return res.json(parseUpstream(upstream));
			} catch (error) {
				if (controller.signal.aborted) return;
				if (error instanceof HttpError) return res.status(error.status).json({ error: error.code });
				serviceLog.write({
					level: "error",
					message: "Quotes proxy failed",
					requestId: req.requestId,
					error: safeErrorSummary(error)
				});
				return res.status(502).json({ error: "quotes_unavailable" });
			} finally {
				res.off("close", cancel);
			}
		})
	);
}
