import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { loadConfig, validateResolvedMongoUri } from "../config.js";

const originalEnvironment = { ...process.env };

function restoreEnvironment() {
	for (const key of Object.keys(process.env)) {
		if (!(key in originalEnvironment)) delete process.env[key];
	}
	Object.assign(process.env, originalEnvironment);
}

function setProductionEnvironment() {
	process.env.NODE_ENV = "production";
	process.env.PUBLIC_ORIGIN = "https://operationopportunity.jacobdanderson.net";
	process.env.SESSION_SECRET = "s".repeat(48);
	process.env.HOST = "127.0.0.1";
	process.env.MONGODB_URI = "mongodb://operation:password@127.0.0.1:27017/opportunity";
	process.env.OPPORTUNITY_COMMIT_SHA = "a".repeat(40);
	process.env.OPPORTUNITY_DEPLOYED_AT = "2026-07-29T12:00:00Z";
	delete process.env.SESSION_SECRETS_JSON;
	delete process.env.CROSS_SITE;
	delete process.env.TRUSTED_PROXY_IPS;
}

describe("loadConfig", () => {
	beforeEach(() => {
		restoreEnvironment();
		setProductionEnvironment();
	});
	afterEach(restoreEnvironment);

	it("accepts a loopback, same-origin, authenticated production configuration", () => {
		process.env.TRUSTED_PROXY_IPS = "127.0.0.1,::1";
		process.env.QUOTES_UPSTREAM_SOCKET_PATH = "/run/quotes/quotes.sock";
		const config = loadConfig();
		assert.equal(config.isProduction, true);
		assert.equal(config.sessionCookieName, "__Host-operation.sid");
		assert.deepEqual(config.trustedProxyIps, ["127.0.0.1", "::1"]);
		assert.equal(config.quotesUpstreamSocketPath, "/run/quotes/quotes.sock");
	});

	it("supports ordered session-secret rotation", () => {
		delete process.env.SESSION_SECRET;
		process.env.SESSION_SECRETS_JSON = JSON.stringify(["a".repeat(48), "b".repeat(48)]);
		assert.deepEqual(loadConfig().sessionSecrets, ["a".repeat(48), "b".repeat(48)]);
	});

	it("rejects weak secrets, cross-site cookies, broad proxy syntax, and public listeners", () => {
		process.env.SESSION_SECRET = "weak";
		assert.throws(() => loadConfig(), /Session secrets/);

		setProductionEnvironment();
		process.env.CROSS_SITE = "true";
		assert.throws(() => loadConfig(), /Cross-site/);

		setProductionEnvironment();
		process.env.TRUSTED_PROXY_IPS = "10.0.0.0/8";
		assert.throws(() => loadConfig(), /exact IP/);

		setProductionEnvironment();
		process.env.HOST = "0.0.0.0";
		assert.throws(() => loadConfig(), /loopback-only/);

		setProductionEnvironment();
		process.env.REQUEST_BODY_LIMIT = "2mb";
		assert.throws(() => loadConfig(), /1kb-1mb/);

		setProductionEnvironment();
		process.env.OPPORTUNITY_COMMIT_SHA = "replace-with-deployed-git-sha";
		assert.throws(() => loadConfig(), /OPPORTUNITY_COMMIT_SHA/);
	});

	it("requires authenticated production MongoDB unless an explicit loopback exception is enabled", () => {
		process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/opportunity";
		assert.throws(() => loadConfig(), /must authenticate/);
		process.env.ALLOW_UNAUTHENTICATED_MONGO_LOOPBACK = "true";
		const config = loadConfig();
		assert.equal(config.allowUnauthenticatedLoopbackMongo, true);
		validateResolvedMongoUri("mongodb://127.0.0.1:27017/opportunity", config);
		validateResolvedMongoUri("mongodb://[::1]:27017/opportunity", config);
		assert.throws(
			() => validateResolvedMongoUri("mongodb://database.example.com/opportunity", config),
			/must authenticate/
		);
		assert.throws(
			() => validateResolvedMongoUri("mongodb://operation:@database.example.com/opportunity", config),
			/must authenticate/
		);
	});

	it("requires TLS for non-loopback production MongoDB traffic", () => {
		process.env.MONGODB_URI = "mongodb://operation:password@database.example.com/opportunity";
		assert.throws(() => loadConfig(), /must use TLS/);

		process.env.MONGODB_URI = "mongodb://operation:password@database.example.com/opportunity?tls=true";
		assert.equal(loadConfig().mongoUri, process.env.MONGODB_URI);

		process.env.MONGODB_URI = "mongodb+srv://operation:password@cluster.example.com/opportunity";
		assert.equal(loadConfig().mongoUri, process.env.MONGODB_URI);

		process.env.MONGODB_URI = "mongodb+srv://operation:password@cluster.example.com/opportunity?tls=false";
		assert.throws(() => loadConfig(), /must use TLS/);
	});

	it("requires complete Vault credentials and protects non-loopback Vault traffic", () => {
		delete process.env.MONGODB_URI;
		process.env.VAULT_ROLE_ID = "role";
		delete process.env.VAULT_SECRET_ID;
		assert.throws(() => loadConfig(), /configured together/);

		process.env.VAULT_SECRET_ID = "secret";
		process.env.VAULT_ADDR = "http://vault.example.com:8200";
		assert.throws(() => loadConfig(), /must use HTTPS/);

		process.env.VAULT_ADDR = "https://vault.example.com/proxy";
		assert.throws(() => loadConfig(), /only scheme and host/);
	});
});
