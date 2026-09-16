import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { networkInterfaces } from "node:os";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

assert.equal(process.cwd(), "/app");
assert.equal(existsSync(process.argv[3]), false, "Source checkout must not be mounted");
for (const path of ["/app/back-end/src", "/app/front-end/src", "/app/.git"]) assert.equal(existsSync(path), false);
assert.equal(process.env.NODE_PATH, undefined);
assert.match(readFileSync("/proc/self/status", "utf8"), /^CapEff:\s+0+$/m);
for (const value of Object.values(networkInterfaces()).flat()) assert.equal(value.internal, true);
assert.throws(() => writeFileSync("/app/forbidden-write", "fixture"));
const require = createRequire("/app/back-end/package.json");
for (const name of ["typescript", "tsx", "esbuild", "supertest"]) assert.throws(() => require.resolve(name));
const { MongoClient } = require("mongoose").mongo;
const manifest = JSON.parse(readFileSync("/app/runtime-manifest.json", "utf8"));
const release = JSON.parse(readFileSync("/app/front-end/dist/release.json", "utf8"));
const children = [];
function start(binary, args, environment = {}) {
	const child = spawn(binary, args, {
		cwd: "/app/back-end",
		env: { ...process.env, ...environment },
		stdio: ["ignore", "pipe", "pipe"]
	});
	let output = "";
	for (const stream of [child.stdout, child.stderr])
		stream.on("data", (chunk) => {
			output = (output + chunk).slice(-8192);
		});
	const exited = new Promise((resolve, reject) => {
		child.once("error", reject);
		child.once("exit", (code, signal) => resolve({ code, signal }));
	});
	const result = { child, exited, output: () => output };
	children.push(result);
	return result;
}
async function exitWithin(runtime, ms = 20000) {
	let timer;
	try {
		return await Promise.race([
			runtime.exited,
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error(`Fixture process did not exit: ${runtime.output()}`)), ms);
			})
		]);
	} finally {
		clearTimeout(timer);
	}
}
async function waitFor(probe) {
	let error;
	for (let i = 0; i < 100; i++) {
		try {
			return await probe();
		} catch (failure) {
			error = failure;
			await delay(100);
		}
	}
	throw error;
}
const environment = {
	NODE_ENV: "production",
	HOST: "127.0.0.1",
	PORT: "3002",
	PUBLIC_ORIGIN: "https://fixture.example",
	MONGODB_URI:
		"mongodb://fixture:Synthetic-mongo-fixture-123@127.0.0.1:55432/operation_fixture?appName=opportunity-acceptance",
	SESSION_SECRET: "Synthetic-session-fixture-key-only-0123456789",
	TRUSTED_PROXY_IPS: "127.0.0.1",
	QUOTES_UPSTREAM_URL: "http://127.0.0.1:55433",
	OPPORTUNITY_COMMIT_SHA: manifest.commit,
	OPPORTUNITY_DEPLOYED_AT: release.deployedAt
};
const base = "http://127.0.0.1:3002";
let cookie = "",
	csrf = "";
async function request(path, method = "GET", body, expected = 200, authenticated = true) {
	const headers = {
		"Content-Type": "application/json",
		"X-Forwarded-Proto": "https",
		Origin: environment.PUBLIC_ORIGIN
	};
	if (authenticated) {
		if (cookie) headers.Cookie = cookie;
		if (csrf) headers["X-CSRF-Token"] = csrf;
	}
	const response = await fetch(base + path, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
		redirect: "manual",
		signal: AbortSignal.timeout(10000)
	});
	const text = await response.text();
	assert.equal(response.status, expected, `${method} ${path}: ${text}`);
	if (authenticated && response.headers.has("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
	const data = text && response.headers.get("content-type")?.includes("json") ? JSON.parse(text) : text;
	if (authenticated && data.csrfToken) csrf = data.csrfToken;
	return data;
}
async function probe(path, status) {
	for (const method of ["GET", "HEAD"]) {
		const response = await fetch(`${base}/${path}`, {
			method,
			redirect: "manual",
			signal: AbortSignal.timeout(2500)
		});
		assert.equal(response.status, status);
		assert.equal(response.headers.get("cache-control"), "no-store");
		for (const header of ["set-cookie", "location", "www-authenticate"])
			assert.equal(response.headers.get(header), null);
		if (method === "HEAD") assert.equal(await response.text(), "");
		else assert.deepEqual(await response.json(), { ok: status === 200 });
	}
}
let control, upstream;
try {
	if (process.argv[2] === "missing-module") {
		const failed = start(process.execPath, ["dist/server.js"], environment);
		assert.deepEqual(await exitWithin(failed), { code: 1, signal: null });
		assert.match(failed.output(), /Cannot find module .*runtimeCapacity/);
		console.log(JSON.stringify({ negativeModule: "passed" }));
	} else {
		const argon = require("argon2");
		const hash = await argon.hash("Synthetic-native-fixture-123");
		assert.equal(await argon.verify(hash, "Synthetic-native-fixture-123"), true);
		mkdirSync("/state/mongo");
		const mongo = start("/usr/bin/mongod", [
			"--dbpath",
			"/state/mongo",
			"--bind_ip",
			"127.0.0.1",
			"--port",
			"55432",
			"--nounixsocket",
			"--wiredTigerCacheSizeGB",
			"0.25",
			"--setParameter",
			"enableTestCommands=1"
		]);
		control = new MongoClient("mongodb://127.0.0.1:55432", { serverSelectionTimeoutMS: 300, timeoutMS: 10000 });
		await waitFor(async () => {
			await control.connect();
			await control.db("admin").command({ ping: 1 });
		});
		await control.db("operation_fixture").command({
			createUser: "fixture",
			pwd: "Synthetic-mongo-fixture-123",
			roles: [{ role: "readWrite", db: "operation_fixture" }]
		});
		let quotesFail = false;
		upstream = http.createServer((_req, res) => {
			if (quotesFail) {
				res.writeHead(503).end("synthetic failure");
				return;
			}
			res.setHeader("Content-Type", "application/json");
			res.end(
				JSON.stringify([{ _id: "fixture", content: "Fixture quote", author: "Fixture", tags: ["success"] }])
			);
		});
		await new Promise((resolve) => upstream.listen(55433, "127.0.0.1", resolve));
		const verify = start(process.execPath, ["dist/scripts/verifyConfig.js"], environment);
		assert.deepEqual(await exitWithin(verify), { code: 0, signal: null });
		// Interactive recovery commands fail closed without input or credentials.
		// Importing their complete graph must work even in a production-only tree.
		for (const entry of ["create-admin-user", "grant-admin-manager", "reset-account-password"]) {
			const command = start(process.execPath, [`dist/${entry}.js`], { NODE_ENV: "production" });
			assert.deepEqual(await exitWithin(command), { code: 1, signal: null });
			assert.doesNotMatch(command.output(), /ERR_MODULE_NOT_FOUND|Cannot find module/);
			assert.match(command.output(), /Production requires valid OPPORTUNITY_COMMIT_SHA/);
		}
		const api = start(process.execPath, ["dist/server.js"], environment);
		await waitFor(() => probe("readyz", 200));
		await probe("healthz", 200);
		assert.deepEqual(await request("/release.json"), release);
		await request("/users/all", "GET", undefined, 401, false);
		await request("/users", "POST", { name: "Forbidden" }, 403, false);
		await request("/accounts/csrf");
		const created = await request(
			"/users",
			"POST",
			{
				name: "Artifact fixture",
				email: "artifact@fixture.test",
				password: "Synthetic-user-fixture-123",
				age: "18",
				state: "Fixture"
			},
			201
		);
		assert.ok(created.currentUser._id);
		assert.equal(created.currentUser.password, undefined);
		assert.equal((await request("/accounts/me")).role, "user");
		await request("/users/all", "GET", undefined, 403);
		await request("/accounts/logout", "DELETE", undefined, 204);
		await request("/accounts/csrf");
		await request("/accounts/login", "POST", { email: "artifact@fixture.test", password: "incorrect" }, 401);
		await request("/accounts/login", "POST", {
			email: "artifact@fixture.test",
			password: "Synthetic-user-fixture-123"
		});
		assert.equal((await request("/users/loggedin")).currentUser.email, "artifact@fixture.test");
		assert.equal((await request("/quotes?random=true&limit=1"))[0].content, "Fixture quote");
		quotesFail = true;
		await request("/quotes?random=true&limit=1", "GET", undefined, 502);
		quotesFail = false;
		assert.equal((await request("/quotes?random=true&limit=1"))[0].content, "Fixture quote");

		const memory = () => {
			const status = readFileSync(`/proc/${api.child.pid}/status`, "utf8");
			return Object.fromEntries(
				["VmRSS", "VmHWM"].map((name) => [
					name,
					Number(new RegExp(`^${name}:\\s+(\\d+)`, "m").exec(status)[1]) * 1024
				])
			);
		};
		const before = memory(),
			latency = [],
			started = performance.now();
		let completed = 0;
		await Promise.all(
			Array.from({ length: 8 }, async () => {
				while (performance.now() - started < 60000) {
					const at = performance.now();
					const response = await fetch(base + "/users/loggedin", {
						headers: { Cookie: cookie, "X-Forwarded-Proto": "https" },
						signal: AbortSignal.timeout(10000)
					});
					assert.equal(response.status, 200);
					assert.equal((await response.json()).currentUser.email, "artifact@fixture.test");
					completed++;
					latency.push(performance.now() - at);
					await delay(25);
				}
			})
		);
		const loaded = memory();
		await delay(5000);
		const recovered = memory();
		latency.sort((a, b) => a - b);
		assert.ok(completed > 100);
		console.log(
			JSON.stringify({
				soak: {
					passed: true,
					commit: manifest.commit,
					seconds: 60,
					idleRecoverySeconds: 5,
					concurrency: 8,
					completed,
					before,
					loaded,
					recovered,
					p95Ms: latency[Math.floor(latency.length * 0.95)]
				}
			})
		);
		await control.db("admin").command({
			configureFailPoint: "failCommand",
			mode: "alwaysOn",
			data: {
				appName: "opportunity-acceptance",
				failCommands: ["ping"],
				blockConnection: true,
				blockTimeMS: 4000
			}
		});
		await probe("readyz", 503);
		await probe("healthz", 200);
		await control.db("admin").command({ configureFailPoint: "failCommand", mode: "off" });
		await probe("readyz", 200);
		await control.db("admin").command({
			configureFailPoint: "failCommand",
			mode: "alwaysOn",
			data: {
				appName: "opportunity-acceptance",
				failCommands: ["update"],
				blockConnection: true,
				blockTimeMS: 750
			}
		});
		const pending = http.request(`${base}/users/user/${created.currentUser._id}`, {
			method: "PUT",
			headers: {
				Cookie: cookie,
				"X-CSRF-Token": csrf,
				"X-Forwarded-Proto": "https",
				Origin: environment.PUBLIC_ORIGIN,
				"Content-Type": "application/json"
			}
		});
		pending.on("error", () => {});
		pending.end(JSON.stringify({ name: "Retained after disconnect" }));
		await waitFor(async () => {
			const ops = await control.db("admin").command({ currentOp: 1, active: true });
			assert.ok(
				ops.inprog.some((op) => op.appName === "opportunity-acceptance" && op.command?.update === "users")
			);
		});
		pending.destroy();
		api.child.kill("SIGTERM");
		await delay(20);
		api.child.kill("SIGTERM");
		assert.deepEqual(await exitWithin(api), { code: 0, signal: null }, api.output());
		assert.match(api.output(), /"event":"user.update".*"responseDisconnected":true/);
		await control.db("admin").command({ configureFailPoint: "failCommand", mode: "off" });
		const record = await control
			.db("operation_fixture")
			.collection("users")
			.findOne({ email: "artifact@fixture.test" });
		assert.equal(record.name, "Retained after disconnect");
		const restarted = start(process.execPath, ["dist/server.js"], environment);
		await waitFor(() => probe("readyz", 200));
		assert.equal((await request("/users/loggedin")).currentUser.name, "Retained after disconnect");
		await request("/accounts/logout", "DELETE", undefined, 204);
		restarted.child.kill("SIGTERM");
		assert.deepEqual(await exitWithin(restarted), { code: 0, signal: null });
		await control.close();
		control = undefined;
		mongo.child.kill("SIGTERM");
		assert.deepEqual(await exitWithin(mongo), { code: 0, signal: null });
		console.log(
			JSON.stringify({
				accepted: true,
				commit: manifest.commit,
				checks: [
					"production-native-binding",
					"compiled-server-and-maintenance-entrypoint-guards",
					"GET-HEAD-health-readiness",
					"signup-login-CSRF-role-isolation-logout",
					"quotes-provider-failure-recovery",
					"database-failure-recovery",
					"disconnected-write-drain-audit",
					"repeated-signals",
					"retained-session-and-account-restart",
					"immutable-artifact",
					"no-source-development-dependencies-or-external-network"
				]
			})
		);
	}
} finally {
	if (control) await control.close();
	if (upstream) {
		upstream.closeAllConnections();
		await new Promise((resolve) => upstream.close(resolve));
	}
	for (const runtime of children)
		if (runtime.child.exitCode === null && runtime.child.signalCode === null) runtime.child.kill("SIGKILL");
	await Promise.allSettled(children.map((runtime) => runtime.exited));
}
