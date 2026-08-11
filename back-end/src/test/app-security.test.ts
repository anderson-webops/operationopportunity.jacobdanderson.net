import type { AppConfig } from "../config.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../app.js";

const origin = "http://localhost:3333";
const config: AppConfig = {
	environment: "test",
	isProduction: false,
	host: "127.0.0.1",
	port: 3002,
	publicOrigin: origin,
	trustedProxyIps: [],
	sessionSecrets: ["s".repeat(48)],
	sessionCookieName: "operation.sid",
	sessionMaxAgeMs: 60_000,
	sessionRememberMaxAgeMs: 120_000,
	mongoUri: "mongodb://127.0.0.1:27017/test",
	allowUnauthenticatedLoopbackMongo: true,
	enableInternalDiagnostics: false,
	quotesUpstreamUrl: new URL("https://jacobdanderson.net/quotes-api"),
	requestBodyLimit: "64kb"
};

describe("hTTP security boundary", () => {
	it("emits hardened, minimal health responses", async () => {
		const response = await request(createApp(config)).get("/healthz").expect(200);
		assert.deepEqual(response.body, { ok: true });
		assert.equal(response.headers["x-content-type-options"], "nosniff");
		assert.match(response.headers["content-security-policy"], /default-src 'none'/);
		assert.equal(response.headers["x-frame-options"], "DENY");
		assert.equal(response.headers["cache-control"], "no-store");
		assert.ok(response.headers["x-request-id"]);
		assert.equal(response.headers["set-cookie"], undefined);
		assert.equal(response.headers.location, undefined);
		assert.equal(response.headers["www-authenticate"], undefined);

		const head = await request(createApp(config)).head("/healthz").expect(200);
		assert.equal(head.text, undefined);
		assert.equal(head.headers["cache-control"], "no-store");

		const ready = await request(
			createApp(config, undefined, {
				getReadiness: async () => true
			})
		)
			.get("/readyz")
			.expect(200);
		assert.deepEqual(ready.body, { ok: true });

		const unavailableApp = createApp(config, undefined, {
			getReadiness: async () => false
		});
		const unavailable = await request(unavailableApp).get("/readyz").expect(503);
		assert.deepEqual(unavailable.body, { ok: false });
		const unavailableHead = await request(unavailableApp).head("/readyz").expect(503);
		assert.equal(unavailableHead.text, undefined);

		const failed = await request(
			createApp(config, undefined, {
				getReadiness: async () => {
					throw new Error("mongodb://operator:secret@internal-host/private-db");
				}
			})
		)
			.get("/readyz")
			.expect(503);
		assert.deepEqual(failed.body, { ok: false });
	});

	it("requires a same-origin, session-bound CSRF token for every mutation", async () => {
		const agent = request.agent(createApp(config));
		const tokenResponse = await agent.get("/accounts/csrf").expect(200);
		const token = tokenResponse.body.csrfToken as string;
		assert.ok(token.length >= 40);
		assert.match(tokenResponse.headers["set-cookie"][0], /HttpOnly/);
		assert.match(tokenResponse.headers["set-cookie"][0], /SameSite=Lax/);
		const repeatedTokenResponse = await agent.get("/accounts/csrf").expect(200);
		assert.equal(
			repeatedTokenResponse.body.csrfToken,
			token,
			"Multiple browser tabs must share one stable token per session."
		);

		await agent.post("/missing").expect(403);
		await agent.post("/missing").set("Origin", "https://attacker.example").set("X-CSRF-Token", token).expect(403);
		await agent.post("/missing").set("Origin", origin).set("X-CSRF-Token", token).expect(404);
	});

	it("protects admin creation and account directories from anonymous access", async () => {
		const agent = request.agent(createApp(config));
		const { body } = await agent.get("/accounts/csrf").expect(200);
		await agent
			.post("/admins")
			.set("Origin", origin)
			.set("X-CSRF-Token", body.csrfToken)
			.send({
				name: "Attacker",
				email: "attacker@example.com",
				password: "long-enough-password"
			})
			.expect(401);
		await agent.get("/users/all").expect(401);
		await agent.get("/tutors/all").expect(401);
	});

	it("hides internal database diagnostics even from loopback callers", async () => {
		await request(createApp(config)).get("/_dbinfo").expect(404);
	});
});
