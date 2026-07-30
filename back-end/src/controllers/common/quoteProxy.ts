import type { Request } from "express";
import type { AppConfig } from "../../config.js";
import { Buffer } from "node:buffer";
import { request } from "node:http";
import { Router } from "express";
import { safeErrorSummary } from "../../errors.js";

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

interface UpstreamResponse {
	status: number;
	body: string;
	transport: "socket" | "url";
}

const DEFAULT_QUOTES_REQUEST_PATH = "/quotes";
const MAX_UPSTREAM_BODY_BYTES = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 5_000;
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
	if (!payload || typeof payload !== "object") return null;
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
		_id: String(idSource).slice(0, 200),
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

export function normalizeQuotesPayload(payload: unknown): NormalizedQuote[] {
	const candidates = Array.isArray(payload)
		? payload
		: payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).quotes)
			? (payload as { quotes: unknown[] }).quotes
			: payload && typeof payload === "object" && "quote" in payload
				? [(payload as Record<string, unknown>).quote]
				: [payload];
	return candidates
		.map(normalizeQuote)
		.filter((quote): quote is NormalizedQuote => quote !== null)
		.slice(0, 100);
}

export function buildQuotesRequestPath(req: Request): string {
	const searchParams = new URLSearchParams();
	for (const key of ALLOWED_QUERY_KEYS) {
		const rawValue = req.query[key];
		const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
		if (typeof value !== "string" || !value || value.length > 200 || hasControlCharacter(value)) {
			continue;
		}
		const normalized = value.trim();
		if (!normalized) continue;
		if (key === "limit") {
			if (!/^\d{1,3}$/.test(normalized) || Number(normalized) < 1 || Number(normalized) > 100) {
				continue;
			}
			searchParams.set(key, String(Number(normalized)));
			continue;
		}
		if (key === "random") {
			if (normalized !== "true" && normalized !== "false") continue;
			searchParams.set(key, normalized);
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
	for (const [key, value] of requestUrl.searchParams) mergedSearchParams.append(key, value);
	baseUrl.search = mergedSearchParams.toString();
	return baseUrl;
}

function readResponseBody(stream: NodeJS.ReadableStream): Promise<string> {
	return new Promise((resolve, reject) => {
		let body = "";
		let size = 0;
		stream.setEncoding("utf8");
		stream.on("data", (chunk: string) => {
			size += Buffer.byteLength(chunk);
			if (size > MAX_UPSTREAM_BODY_BYTES) {
				reject(new Error("Quotes response exceeds the configured limit"));
				if ("destroy" in stream && typeof stream.destroy === "function") stream.destroy();
				return;
			}
			body += chunk;
		});
		stream.on("end", () => resolve(body));
		stream.on("error", reject);
	});
}

export function fetchQuotesViaSocket(path: string, socketPath: string): Promise<UpstreamResponse> {
	return new Promise((resolve, reject) => {
		const upstreamRequest = request(
			{
				socketPath,
				path,
				method: "GET",
				headers: { accept: "application/json", host: "localhost" },
				timeout: UPSTREAM_TIMEOUT_MS
			},
			async (response) => {
				try {
					resolve({
						status: response.statusCode ?? 502,
						body: await readResponseBody(response),
						transport: "socket"
					});
				} catch (error) {
					reject(error);
				}
			}
		);
		upstreamRequest.on("timeout", () => upstreamRequest.destroy(new Error("Quotes socket request timed out")));
		upstreamRequest.on("error", reject);
		upstreamRequest.end();
	});
}

export async function fetchQuotesViaHttp(url: URL): Promise<UpstreamResponse> {
	const response = await fetch(url, {
		headers: { accept: "application/json" },
		redirect: "error",
		signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
	});
	const declaredLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredLength) && declaredLength > MAX_UPSTREAM_BODY_BYTES) {
		throw new Error("Quotes response exceeds the configured limit");
	}
	if (!response.body) throw new Error("Quotes service returned an empty response");
	const reader = response.body.getReader();
	const chunks: Buffer[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > MAX_UPSTREAM_BODY_BYTES) {
			await reader.cancel();
			throw new Error("Quotes response exceeds the configured limit");
		}
		chunks.push(Buffer.from(value));
	}
	return {
		status: response.status,
		body: Buffer.concat(chunks, size).toString("utf8"),
		transport: "url"
	};
}

async function fetchQuotesUpstream(req: Request, config: AppConfig): Promise<UpstreamResponse> {
	const requestPath = buildQuotesRequestPath(req);
	if (config.quotesUpstreamSocketPath) {
		try {
			return await fetchQuotesViaSocket(requestPath, config.quotesUpstreamSocketPath);
		} catch (error) {
			console.error("Quotes socket request failed", {
				requestId: req.requestId,
				error: safeErrorSummary(error)
			});
		}
	}
	return fetchQuotesViaHttp(resolveQuotesUpstreamUrl(config.quotesUpstreamUrl, requestPath));
}

export function createQuoteProxy(config: AppConfig): Router {
	return Router().get("/", async (req, res) => {
		try {
			const upstream = await fetchQuotesUpstream(req, config);
			if (upstream.status < 200 || upstream.status >= 300) {
				return res.status(502).json({ error: "quotes_unavailable" });
			}
			const quotes = normalizeQuotesPayload(JSON.parse(upstream.body));
			if (!quotes.length) return res.status(502).json({ error: "quotes_unavailable" });
			return res.json(quotes);
		} catch (error) {
			console.error("Quotes proxy failed", {
				requestId: req.requestId,
				error: safeErrorSummary(error)
			});
			return res.status(502).json({ error: "quotes_unavailable" });
		}
	});
}
