import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createHash } from "node:crypto";
import http from "node:http";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const [mode, compiledDirectory, scenario] = process.argv.slice(2);
if (mode === "server") {
	const upstream = http.createServer((_request, response) => {
		response.setHeader("Content-Type", "application/json");
		response.end(
			JSON.stringify([
				{
					_id: "fixture-1",
					content: "Fixture quote",
					author: "Fixture",
					tags: ["success"],
					authorSlug: "fixture",
					length: 13,
					dateAdded: "2026-09-16",
					dateModified: "2026-09-16"
				}
			])
		);
	});
	const listen = async (server) => {
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		return server.address().port;
	};
	const upstreamPort = await listen(upstream);
	const { createApp } = await import(pathToFileURL(path.resolve(compiledDirectory, "app.js")));
	const app = createApp(
		{
			environment: "test",
			isProduction: false,
			host: "127.0.0.1",
			port: 0,
			publicOrigin: "http://fixture.example",
			trustedProxyIps: ["127.0.0.1"],
			sessionSecrets: ["synthetic-measurement-session-key".padEnd(48, "s")],
			sessionCookieName: "fixture.sid",
			sessionMaxAgeMs: 60000,
			sessionRememberMaxAgeMs: 120000,
			allowUnauthenticatedLoopbackMongo: true,
			enableInternalDiagnostics: false,
			quotesUpstreamUrl: new URL(`http://127.0.0.1:${upstreamPort}`),
			requestBodyLimit: "64kb"
		},
		undefined,
		{ getReadiness: async () => true }
	);
	const server = http.createServer(app);
	server.requestTimeout = 15000;
	server.headersTimeout = 10000;
	server.keepAliveTimeout = 5000;
	const port = await listen(server);
	let peakRss = 0;
	const sample = () => {
		const memory = process.memoryUsage();
		peakRss = Math.max(peakRss, memory.rss);
		return memory;
	};
	const timer = setInterval(sample, 10);
	process.on("message", async (message) => {
		if (message.type === "sample") process.send({ type: "sample", memory: sample(), peakRss });
		if (message.type === "stop") {
			clearInterval(timer);
			app.get("capacity")?.stop();
			for (const listener of [server, upstream]) {
				listener.closeAllConnections();
				await new Promise((resolve) => listener.close(resolve));
			}
			await app.get("capacity")?.drain();
			process.exit(0);
		}
	});
	process.send({ type: "ready", port, memory: sample() });
} else {
	assert.ok(["normal", "slow-bodies"].includes(scenario));
	const child = fork(new URL(import.meta.url), ["server", compiledDirectory], {
		stdio: ["ignore", "ignore", "pipe", "ipc"]
	});
	let diagnostics = "";
	child.stderr.on("data", (chunk) => {
		diagnostics = (diagnostics + chunk).slice(-4096);
	});
	const exited = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
	const message = (type) =>
		new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				child.off("message", receive);
				reject(new Error(`Fixture ${type} timeout: ${diagnostics}`));
			}, 10000);
			const receive = (value) => {
				if (value.type === type) {
					clearTimeout(timer);
					child.off("message", receive);
					resolve(value);
				}
			};
			child.on("message", receive);
		});
	const sample = async () => {
		const pending = message("sample");
		child.send({ type: "sample" });
		return pending;
	};
	const clients = [];
	try {
		const ready = await message("ready"),
			base = `http://127.0.0.1:${ready.port}`;
		const latencies = [];
		let requests = 0,
			digest,
			rejected = 0;
		async function read() {
			const identity = (requests++ % 20) + 1,
				started = performance.now();
			const response = await fetch(base + "/quotes?random=true&limit=1", {
				headers: { "X-Forwarded-For": `198.18.0.${identity}` },
				signal: AbortSignal.timeout(10000)
			});
			assert.equal(response.status, 200);
			const body = await response.text();
			assert.equal(JSON.parse(body)[0].content, "Fixture quote");
			const hash = createHash("sha256").update(body).digest("hex");
			digest ??= hash;
			assert.equal(hash, digest);
			latencies.push(performance.now() - started);
		}
		for (let i = 0; i < 100; i++) await read();
		const warm = await sample(),
			started = performance.now();
		if (scenario === "normal")
			await Promise.all(
				Array.from({ length: 8 }, async () => {
					for (let i = 0; i < 100; i++) await read();
				})
			);
		else {
			for (let i = 0; i < 256; i++) {
				const request = http.request(
					base + "/quotes",
					{ method: "POST", headers: { "Content-Type": "application/json", "Content-Length": 30000 } },
					(response) => {
						if (response.statusCode === 503) rejected++;
						response.resume();
					}
				);
				request.on("error", () => {});
				request.write('{"content":"' + "x".repeat(15000));
				clients.push(request);
			}
			await delay(1000);
		}
		const elapsedMs = performance.now() - started,
			loaded = await sample();
		for (const client of clients) client.destroy();
		await delay(200);
		await read();
		const recovered = await sample();
		latencies.sort((a, b) => a - b);
		child.send({ type: "stop" });
		let timeout;
		let exit;
		try {
			exit = await Promise.race([
				exited,
				new Promise((_, reject) => {
					timeout = setTimeout(() => reject(new Error("Fixture shutdown timed out")), 10000);
				})
			]);
		} finally {
			clearTimeout(timeout);
		}
		assert.deepEqual(exit, { code: 0, signal: null });
		console.log(
			JSON.stringify({
				scenario,
				platform: process.platform,
				arch: process.arch,
				node: process.version,
				requests,
				idle: ready.memory,
				warm: warm.memory,
				loaded: loaded.memory,
				recovered: recovered.memory,
				peakRss: recovered.peakRss,
				p95Ms: latencies[Math.floor(latencies.length * 0.95)],
				elapsedMs,
				responseSha256: digest,
				slowClients: clients.length,
				rejected,
				shutdown: exit
			})
		);
	} finally {
		for (const client of clients) client.destroy();
		if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
	}
}
