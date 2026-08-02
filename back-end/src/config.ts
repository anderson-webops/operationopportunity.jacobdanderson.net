import { isIP } from "node:net";
import { isAbsolute } from "node:path";
import { env } from "node:process";
import { getDeploymentIdentity } from "./release.js";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const MAX_SECRET_LENGTH = 512;
const MIN_SECRET_LENGTH = 32;
const MIN_REQUEST_BODY_BYTES = 1024;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

export interface VaultConfig {
	address: URL;
	roleId: string;
	secretId: string;
	secretPath: string;
}

export interface AppConfig {
	environment: "development" | "test" | "production";
	isProduction: boolean;
	host: string;
	port: number;
	publicOrigin: string;
	trustedProxyIps: string[];
	sessionSecrets: string[];
	sessionCookieName: string;
	sessionMaxAgeMs: number;
	sessionRememberMaxAgeMs: number;
	mongoUri?: string;
	allowUnauthenticatedLoopbackMongo: boolean;
	vault?: VaultConfig;
	enableInternalDiagnostics: boolean;
	internalDiagnosticsKey?: string;
	quotesUpstreamSocketPath?: string;
	quotesUpstreamUrl: URL;
	requestBodyLimit: string;
}

function readBoolean(name: string, fallback = false): boolean {
	const value = env[name]?.trim().toLowerCase();
	if (!value) return fallback;
	if (value === "true") return true;
	if (value === "false") return false;
	throw new Error(`${name} must be true or false`);
}

function readInteger(name: string, fallback: number, min: number, max: number): number {
	const raw = env[name]?.trim();
	if (!raw) return fallback;
	if (!/^\d+$/.test(raw)) throw new Error(`${name} must be an integer`);
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < min || value > max) {
		throw new Error(`${name} must be between ${min} and ${max}`);
	}
	return value;
}

function readRequestBodyLimit(): string {
	const raw = (env.REQUEST_BODY_LIMIT?.trim() || "64kb").toLowerCase();
	const match = /^(\d+)(b|kb|mb)$/.exec(raw);
	if (!match) throw new Error("REQUEST_BODY_LIMIT must use b, kb, or mb units");
	const units = { b: 1, kb: 1024, mb: 1024 * 1024 } as const;
	const value = Number(match[1]);
	const bytes = value * units[match[2] as keyof typeof units];
	if (!Number.isSafeInteger(bytes) || bytes < MIN_REQUEST_BODY_BYTES || bytes > MAX_REQUEST_BODY_BYTES) {
		throw new Error("REQUEST_BODY_LIMIT must resolve to 1kb-1mb");
	}
	return raw;
}

function parseSessionSecrets(): string[] {
	const rawJson = env.SESSION_SECRETS_JSON?.trim();
	if (rawJson && env.SESSION_SECRET?.trim()) {
		throw new Error("Configure SESSION_SECRET or SESSION_SECRETS_JSON, not both");
	}
	let secrets: unknown;

	if (rawJson) {
		try {
			secrets = JSON.parse(rawJson);
		} catch {
			throw new Error("SESSION_SECRETS_JSON must be valid JSON");
		}
	} else {
		secrets = env.SESSION_SECRET ? [env.SESSION_SECRET] : [];
	}

	if (!Array.isArray(secrets) || secrets.length === 0 || !secrets.every((secret) => typeof secret === "string")) {
		throw new Error("At least one session secret is required");
	}

	const normalized = secrets.map((secret) => secret.trim());
	if (normalized.some((secret) => secret.length < MIN_SECRET_LENGTH || secret.length > MAX_SECRET_LENGTH)) {
		throw new Error(`Session secrets must be ${MIN_SECRET_LENGTH}-${MAX_SECRET_LENGTH} characters`);
	}
	if (normalized.some((secret) => /^replace[-_]/i.test(secret))) {
		throw new Error("Session secrets must not use example placeholders");
	}
	if (new Set(normalized).size !== normalized.length) {
		throw new Error("Session secrets must be unique");
	}
	return normalized;
}

function parseOrigin(environment: AppConfig["environment"]): string {
	const raw = env.PUBLIC_ORIGIN?.trim() || (environment === "production" ? "" : "http://localhost:3333");
	if (!raw) throw new Error("PUBLIC_ORIGIN is required in production");

	const origin = new URL(raw);
	if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
		throw new Error("PUBLIC_ORIGIN must contain only scheme and host");
	}
	if (environment === "production" && origin.protocol !== "https:") {
		throw new Error("PUBLIC_ORIGIN must use HTTPS in production");
	}
	if (!["http:", "https:"].includes(origin.protocol)) {
		throw new Error("PUBLIC_ORIGIN must use HTTP or HTTPS");
	}
	return origin.origin;
}

function parseTrustedProxyIps(): string[] {
	const values = (env.TRUSTED_PROXY_IPS || "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	if (values.some((value) => isIP(value) === 0)) {
		throw new Error("TRUSTED_PROXY_IPS accepts exact IP addresses only");
	}
	return [...new Set(values)];
}

function parseVault(environment: AppConfig["environment"]): VaultConfig | undefined {
	const roleId = env.VAULT_ROLE_ID?.trim();
	const secretId = env.VAULT_SECRET_ID?.trim();
	if (!roleId && !secretId) return undefined;
	if (!roleId || !secretId) {
		throw new Error("VAULT_ROLE_ID and VAULT_SECRET_ID must be configured together");
	}
	if (
		roleId.length < 8 ||
		roleId.length > MAX_SECRET_LENGTH ||
		secretId.length < 8 ||
		secretId.length > MAX_SECRET_LENGTH ||
		/^replace[-_]/i.test(roleId) ||
		/^replace[-_]/i.test(secretId)
	) {
		throw new Error("Vault role and secret identifiers must be non-placeholder values of 8-512 characters");
	}

	const address = new URL(env.VAULT_ADDR?.trim() || "http://127.0.0.1:8200");
	if (!["http:", "https:"].includes(address.protocol)) {
		throw new Error("VAULT_ADDR must use HTTP or HTTPS");
	}
	if (address.username || address.password || address.pathname !== "/" || address.search || address.hash) {
		throw new Error("VAULT_ADDR must contain only scheme and host");
	}
	if (environment === "production" && address.protocol !== "https:" && !LOOPBACK_HOSTS.has(address.hostname)) {
		throw new Error("Production Vault traffic must use HTTPS unless Vault is loopback-only");
	}

	const secretPath = env.VAULT_MONGO_SECRET_PATH?.trim() || "secret/data/opportunity/mongodb";
	if (!/^[\w/-]+$/.test(secretPath) || secretPath.startsWith("/") || secretPath.includes("..")) {
		throw new Error("VAULT_MONGO_SECRET_PATH is invalid");
	}

	return { address, roleId, secretId, secretPath };
}

function mongoHostsAreLoopback(uri: string): boolean {
	const authority = uri.replace(/^mongodb(?:\+srv)?:\/\//, "").split("/")[0] || "";
	const hostList = authority.includes("@") ? authority.split("@").at(-1) || "" : authority;
	const hosts = hostList.split(",").map((entry) => {
		const value = entry.trim();
		if (value.startsWith("[")) {
			const closingBracket = value.indexOf("]");
			if (closingBracket < 0 || !/^(?::\d+)?$/.test(value.slice(closingBracket + 1))) return "";
			return value.slice(1, closingBracket);
		}
		const colon = value.lastIndexOf(":");
		return colon > 0 && value.indexOf(":") === colon ? value.slice(0, colon) : value;
	});
	return hosts.length > 0 && hosts.every((host) => LOOPBACK_HOSTS.has(host));
}

function mongoUriUsesTls(uri: string): boolean {
	const query = uri.includes("?") ? uri.slice(uri.indexOf("?") + 1) : "";
	const options = new Map(
		[...new URLSearchParams(query)].map(([key, value]) => [key.toLowerCase(), value.toLowerCase()])
	);
	const explicit = options.get("tls") ?? options.get("ssl");
	if (explicit !== undefined) return explicit === "true";
	return uri.startsWith("mongodb+srv://");
}

function mongoUriHasCredentials(uri: string): boolean {
	const authority = uri.replace(/^mongodb(?:\+srv)?:\/\//, "").split("/")[0] || "";
	const credentialPart = authority.includes("@") ? authority.slice(0, authority.lastIndexOf("@")) : "";
	const separator = credentialPart.indexOf(":");
	if (separator <= 0 || separator >= credentialPart.length - 1) return false;
	try {
		const username = decodeURIComponent(credentialPart.slice(0, separator)).trim();
		const password = decodeURIComponent(credentialPart.slice(separator + 1)).trim();
		return Boolean(username && password && !/^replace[-_]/i.test(password));
	} catch {
		return false;
	}
}

function validateMongoUri(uri: string, environment: AppConfig["environment"], _allowLoopback: boolean) {
	if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) {
		throw new Error("MONGODB_URI must use mongodb:// or mongodb+srv://");
	}
	if (environment === "production" && !mongoUriHasCredentials(uri)) {
		throw new Error("Production MongoDB must authenticate");
	}
	if (environment === "production" && !mongoHostsAreLoopback(uri) && !mongoUriUsesTls(uri)) {
		throw new Error("Production MongoDB traffic must use TLS unless every host is loopback-only");
	}
}

export function validateResolvedMongoUri(
	uri: string,
	config: Pick<AppConfig, "environment" | "allowUnauthenticatedLoopbackMongo">
): void {
	validateMongoUri(uri, config.environment, config.allowUnauthenticatedLoopbackMongo);
}

function parseQuotesUrl(environment: AppConfig["environment"]): URL {
	const result = new URL(env.QUOTES_UPSTREAM_URL?.trim() || "https://jacobdanderson.net/quotes-api");
	if (!["http:", "https:"].includes(result.protocol)) {
		throw new Error("QUOTES_UPSTREAM_URL must use HTTP or HTTPS");
	}
	if (environment === "production" && result.protocol !== "https:" && !LOOPBACK_HOSTS.has(result.hostname)) {
		throw new Error("Production quote fallback traffic must use HTTPS unless loopback-only");
	}
	if (result.username || result.password || result.hash) {
		throw new Error("QUOTES_UPSTREAM_URL must not contain credentials or fragments");
	}
	return result;
}

export function loadConfig(): AppConfig {
	const rawEnvironment = env.NODE_ENV?.trim() || "development";
	if (!["development", "test", "production"].includes(rawEnvironment)) {
		throw new Error("NODE_ENV must be development, test, or production");
	}
	const environment = rawEnvironment as AppConfig["environment"];
	const isProduction = environment === "production";
	if (isProduction) {
		const deployment = getDeploymentIdentity();
		if (!deployment.commit || !deployment.deployedAt) {
			throw new Error("Production requires valid OPPORTUNITY_COMMIT_SHA and OPPORTUNITY_DEPLOYED_AT");
		}
	}
	const host = env.HOST?.trim() || "127.0.0.1";
	if (isIP(host) === 0 && host !== "localhost") {
		throw new Error("HOST must be an exact IP address or localhost");
	}
	if (isProduction && !LOOPBACK_HOSTS.has(host)) {
		throw new Error("Production listeners must be loopback-only");
	}
	if (isProduction && readBoolean("CROSS_SITE")) {
		throw new Error("Cross-site cookie sessions are not supported; proxy the API under PUBLIC_ORIGIN");
	}

	const allowUnauthenticatedLoopbackMongo = readBoolean("ALLOW_UNAUTHENTICATED_MONGO_LOOPBACK");
	if (isProduction && allowUnauthenticatedLoopbackMongo) {
		throw new Error("Unauthenticated MongoDB is not permitted in production");
	}
	const mongoUri = env.MONGODB_URI?.trim() || undefined;
	if (mongoUri) validateMongoUri(mongoUri, environment, allowUnauthenticatedLoopbackMongo);
	const vault = parseVault(environment);
	if (mongoUri && vault) throw new Error("Configure MONGODB_URI or Vault, not both");
	if (isProduction && !mongoUri && !vault) {
		throw new Error("Production requires exactly one MongoDB secret source");
	}
	const trustedProxyIps = parseTrustedProxyIps();
	if (isProduction && (!trustedProxyIps.length || trustedProxyIps.some((value) => !LOOPBACK_HOSTS.has(value)))) {
		throw new Error("Production requires one or more exact loopback trusted proxy IPs");
	}
	const sessionSecrets = parseSessionSecrets();
	const sessionMaxAgeMs = readInteger(
		"SESSION_MAX_AGE_MS",
		24 * 60 * 60 * 1000,
		5 * 60 * 1000,
		7 * 24 * 60 * 60 * 1000
	);
	const sessionRememberMaxAgeMs = readInteger(
		"SESSION_REMEMBER_MAX_AGE_MS",
		30 * 24 * 60 * 60 * 1000,
		24 * 60 * 60 * 1000,
		90 * 24 * 60 * 60 * 1000
	);
	if (sessionRememberMaxAgeMs < sessionMaxAgeMs) {
		throw new Error("SESSION_REMEMBER_MAX_AGE_MS must not be shorter than SESSION_MAX_AGE_MS");
	}

	const enableInternalDiagnostics = readBoolean("ENABLE_INTERNAL_DIAGNOSTICS");
	const internalDiagnosticsKey = env.INTERNAL_DIAGNOSTICS_KEY?.trim() || undefined;
	if (enableInternalDiagnostics && (!internalDiagnosticsKey || internalDiagnosticsKey.length < MIN_SECRET_LENGTH)) {
		throw new Error(`INTERNAL_DIAGNOSTICS_KEY must be at least ${MIN_SECRET_LENGTH} characters`);
	}

	const quotesUpstreamSocketPath = env.QUOTES_UPSTREAM_SOCKET_PATH?.trim() || undefined;
	if (quotesUpstreamSocketPath) {
		if (!isAbsolute(quotesUpstreamSocketPath) || !quotesUpstreamSocketPath.startsWith("/run/quotes/")) {
			throw new Error("QUOTES_UPSTREAM_SOCKET_PATH must be absolute and beneath /run/quotes");
		}
	}

	return {
		environment,
		isProduction,
		host,
		port: readInteger("PORT", 3002, 1, 65_535),
		publicOrigin: parseOrigin(environment),
		trustedProxyIps,
		sessionSecrets,
		sessionCookieName: isProduction ? "__Host-operation.sid" : "operation.sid",
		sessionMaxAgeMs,
		sessionRememberMaxAgeMs,
		mongoUri,
		allowUnauthenticatedLoopbackMongo,
		vault,
		enableInternalDiagnostics,
		internalDiagnosticsKey,
		quotesUpstreamSocketPath,
		quotesUpstreamUrl: parseQuotesUrl(environment),
		requestBodyLimit: readRequestBodyLimit()
	};
}
