import assert from "node:assert/strict";
import { execFileSync, fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

// Compiled UI/API only. Seeding, HTTP proxy and browser control live outside
// the measured backend. Fixtures never contact external providers.
const script = fileURLToPath(import.meta.url);
const listen = async (server) => {
	await new Promise((done) => server.listen(0, "127.0.0.1", done));
	return server.address().port;
};
if (process.argv[2] === "server") {
	const [, , , root, uri, origin] = process.argv;
	assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test_directory_[a-f0-9]+$/);
	const require = createRequire(join(root, "package.json")),
		mongoose = require("mongoose");
	const at = (name) => import(pathToFileURL(join(root, "back-end/dist", name)));
	const { createApp } = await at("app.js"),
		{ DATABASE_OPTIONS } = await at("databaseCapacity.js");
	await mongoose.connect(uri, DATABASE_OPTIONS);
	await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
	const upstream = http.createServer((_req, res) => {
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify([
				{
					_id: "fixture",
					content: "Synthetic local quote.",
					author: "Fixture",
					tags: ["success"],
					authorSlug: "fixture",
					length: 22,
					dateAdded: "2026-09-16",
					dateModified: "2026-09-16"
				}
			])
		);
	});
	const upstreamPort = await listen(upstream);
	const app = createApp({
		environment: "test",
		isProduction: false,
		host: "127.0.0.1",
		port: 0,
		publicOrigin: origin,
		trustedProxyIps: [],
		sessionSecrets: ["synthetic-directory-session-key".padEnd(48, "s")],
		sessionCookieName: "fixture.sid",
		sessionMaxAgeMs: 600000,
		sessionRememberMaxAgeMs: 600000,
		mongoUri: uri,
		allowUnauthenticatedLoopbackMongo: true,
		enableInternalDiagnostics: false,
		quotesUpstreamUrl: new URL("http://127.0.0.1:" + upstreamPort),
		requestBodyLimit: "64kb"
	});
	const server = http.createServer(app),
		port = await listen(server);
	let peakRss = 0,
		peakHeap = 0;
	const sample = () => {
		const memory = process.memoryUsage();
		peakRss = Math.max(peakRss, memory.rss);
		peakHeap = Math.max(peakHeap, memory.heapUsed);
		return { ...memory, peakRss, peakHeap, activeRequests: app.get("capacity").activeRequests };
	};
	const timer = setInterval(sample, 20);
	process.on("message", async (message) => {
		if (message.type === "sample") {
			if (message.reset) peakRss = peakHeap = 0;
			process.send({ type: "sample", memory: sample() });
		}
		if (message.type === "stop") {
			clearInterval(timer);
			app.get("capacity").stop();
			for (const listener of [server, upstream]) {
				listener.closeIdleConnections();
				await new Promise((done) => listener.close(done));
			}
			await app.get("capacity").drain();
			await mongoose.disconnect();
			process.exit(0);
		}
	});
	process.send({ type: "ready", port, memory: sample() });
} else {
	const [, , baselineArg, candidateArg, uri, outputArg, pairsArg = "3"] = process.argv;
	assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test$/);
	const baseline = resolve(baselineArg),
		candidate = resolve(candidateArg),
		output = resolve(outputArg);
	assert.ok(output.startsWith(join(candidate, ".ai-work/runs/")));
	await mkdir(output, { recursive: true });
	const inputs = {};
	for (const [name, root] of Object.entries({ baseline, candidate })) {
		const files = {};
		async function collect(directory) {
			for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
				const path = join(directory, entry.name);
				if (entry.isDirectory()) await collect(path);
				else if (entry.isFile())
					files[path] = createHash("sha256")
						.update(await readFile(join(root, path)))
						.digest("hex");
				else throw new Error("Unexpected compiled-tree link");
			}
		}
		await collect("back-end/dist");
		await collect("front-end/dist");
		for (const path of ["package-lock.json", "back-end/package-lock.json"])
			files[path] = createHash("sha256")
				.update(await readFile(join(root, path)))
				.digest("hex");
		inputs[name] = {
			sourceRevision: execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
			sourceHasUncommittedChanges: Boolean(
				execFileSync("git", ["-C", root, "status", "--porcelain"], { encoding: "utf8" }).trim()
			),
			files
		};
	}
	const require = createRequire(join(candidate, "package.json"));
	const { MongoClient, ObjectId } = require("mongoose").mongo,
		puppeteer = require("puppeteer");
	const client = new MongoClient(uri, { maxPoolSize: 2, timeoutMS: 10000 });
	await client.connect();
	const password = "Synthetic-directory-fixture-123",
		hash = await require("argon2").hash(password);
	const count = 1500,
		results = [];
	const id = (value) => new ObjectId(value.toString(16).padStart(24, "0"));
	const managerId = id(999999),
		paths = ["/admins", "/tutors/all", "/users/all"];
	let expectedDigest;
	try {
		for (let pair = 0; pair < Number(pairsArg); pair++) {
			for (const variant of pair % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"]) {
				const root = variant === "baseline" ? baseline : candidate;
				const database = client.db(
					"operation_security_test_directory_" + randomUUID().replaceAll("-", "").slice(0, 24)
				);
				const target = new URL(uri);
				target.pathname = "/" + database.databaseName;
				const manager = {
					_id: managerId,
					name: "Manager",
					role: "admin",
					email: "manager@fixture.test",
					password: hash,
					authVersion: 0,
					editAdmins: true,
					createdAt: new Date(0),
					updatedAt: new Date(0),
					__v: 0
				};
				await database.collection("admins").insertOne(manager);
				await database
					.collection("accountemails")
					.insertOne({ _id: manager.email, role: "admin", accountId: managerId });
				for (const [roleIndex, role] of ["admin", "tutor", "user"].entries()) {
					for (let offset = 0; offset < count; offset += 250) {
						const rows = Array.from({ length: Math.min(250, count - offset) }, (_, index) => {
							const n = index + offset;
							return {
								_id: id(roleIndex * count + n + 1),
								name: role[0].toUpperCase() + role.slice(1) + " " + String(n).padStart(6, "0"),
								email: role + "-" + n + "@fixture.test",
								password: hash,
								role,
								authVersion: 0,
								age: "20",
								state: "GA",
								createdAt: new Date(n + 1),
								updatedAt: new Date(n + 1),
								__v: 0,
								...(role === "admin" ? { editAdmins: false } : {}),
								...(role === "tutor" ? { status: "active" } : {}),
								...(role === "user" ? { tutor: id(count + 1) } : {})
							};
						});
						await database.collection(role + "s").insertMany(rows);
						await database
							.collection("accountemails")
							.insertMany(rows.map((row) => ({ _id: row.email, role, accountId: row._id })));
					}
				}
				let backendPort;
				const proxy = http.createServer(async (req, res) => {
					if (req.url.startsWith("/api/")) {
						if (!backendPort) {
							res.writeHead(503).end();
							return;
						}
						const remote = http.request(
							{
								hostname: "127.0.0.1",
								port: backendPort,
								path: req.url.slice(4),
								method: req.method,
								headers: req.headers
							},
							(reply) => {
								res.writeHead(reply.statusCode, reply.headers);
								reply.pipe(res);
							}
						);
						remote.on("error", () => {
							if (!res.headersSent) res.writeHead(502);
							res.end();
						});
						res.once("close", () => remote.destroy());
						req.pipe(remote);
						return;
					}
					try {
						const base = join(root, "front-end/dist"),
							pathname = new URL(req.url, "http://fixture").pathname;
						let file = resolve(base, "." + decodeURIComponent(pathname));
						if (!file.startsWith(base + "/") && file !== base) {
							res.writeHead(404).end();
							return;
						}
						if (!(await stat(file).catch(() => null))?.isFile()) file = join(base, "index.html");
						res.setHeader(
							"Content-Type",
							{
								".html": "text/html",
								".js": "text/javascript",
								".css": "text/css",
								".json": "application/json",
								".svg": "image/svg+xml",
								".png": "image/png",
								".webp": "image/webp",
								".ico": "image/x-icon"
							}[extname(file)] || "application/octet-stream"
						);
						createReadStream(file).pipe(res);
					} catch {
						res.writeHead(500).end();
					}
				});
				const base = "http://127.0.0.1:" + (await listen(proxy));
				const child = fork(script, ["server", root, target.toString(), base], {
					stdio: ["ignore", "ignore", "pipe", "ipc"]
				});
				let stderr = "";
				child.stderr.on("data", (chunk) => {
					stderr = (stderr + chunk).slice(-8192);
				});
				const exited = new Promise((done) => child.once("exit", (code, signal) => done({ code, signal })));
				function message(type) {
					return new Promise((done, reject) => {
						const receive = (value) => {
							if (value.type === type) {
								clearTimeout(timer);
								child.off("message", receive);
								done(value);
							}
						};
						const timer = setTimeout(() => {
							child.off("message", receive);
							reject(Error(type + " timeout " + stderr));
						}, 20000);
						child.on("message", receive);
					});
				}
				const sample = async (reset = false) => {
					const pending = message("sample");
					child.send({ type: "sample", reset });
					return (await pending).memory;
				};
				let browser, profile;
				try {
					backendPort = (await message("ready")).port;
					let cookie;
					const request = async (route, options = {}) => {
						const response = await fetch(base + "/api" + route, {
							...options,
							headers: { ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
							signal: AbortSignal.timeout(15000)
						});
						if (response.headers.get("set-cookie"))
							cookie = response.headers.get("set-cookie").split(";")[0];
						assert.equal(response.status, 200, route);
						return response.json();
					};
					const { csrfToken } = await request("/accounts/csrf");
					await request("/accounts/login", {
						method: "POST",
						headers: { Origin: base, "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
						body: JSON.stringify({ email: manager.email, password })
					});
					const semantics = (rows) =>
						rows
							.map((row) =>
								Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)))
							)
							.sort((a, b) => a._id.localeCompare(b._id));
					const warmRows = await Promise.all(paths.map((path) => request(path)));
					assert.deepEqual(
						warmRows.map((rows) => rows.length),
						[count + 1, count, count]
					);
					const digest = createHash("sha256")
						.update(JSON.stringify(warmRows.map(semantics)))
						.digest("hex");
					expectedDigest ??= digest;
					assert.equal(digest, expectedDigest, "complete legacy semantic parity");
					const warm = await sample(true),
						latencies = [],
						legacyStart = performance.now();
					for (let iteration = 0; iteration < 5; iteration++)
						await Promise.all(
							paths.map(async (path) => {
								const started = performance.now();
								await request(path);
								latencies.push(performance.now() - started);
							})
						);
					const elapsedMs = performance.now() - legacyStart,
						loaded = await sample();
					await delay(2000);
					const recovered = await sample();
					const legacy = {
						count: count * 3 + 1,
						requests: latencies.length,
						elapsedMs,
						p95Ms: latencies.sort((a, b) => a - b)[Math.ceil(latencies.length * 0.95) - 1],
						semanticSha256: digest,
						warm,
						loaded,
						recovered
					};
					profile = await mkdtemp(join(output, "chrome-"));
					browser = await puppeteer.launch({
						executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
						headless: true,
						userDataDir: profile,
						args: ["--disable-background-networking"]
					});
					const page = await browser.newPage(),
						errors = [];
					await page.setViewport({ width: 1440, height: 1000 });
					page.on("pageerror", (error) => errors.push(String(error)));
					await page.setRequestInterception(true);
					let heldWrite,
						writeSeen,
						holdWrite = false;
					page.on("request", (req) => {
						if (
							!req.url().startsWith(base + "/") &&
							!req.url().startsWith("data:") &&
							!req.url().startsWith("blob:")
						) {
							void req.abort();
							return;
						}
						if (
							holdWrite &&
							req.method() === "PUT" &&
							new URL(req.url()).pathname.startsWith("/api/admins/")
						) {
							heldWrite = req;
							writeSeen();
							return;
						}
						void req.continue();
					});
					await page.goto(base, { waitUntil: "networkidle0" });
					await page.click("header button.btn-outline-success");
					await page.type("#uname", manager.email);
					await page.type("#psw1", password);
					await page.click(".loginForm button[type=submit]");
					await page.waitForSelector("header button.btn-outline-danger");
					const uiIdle = await page.metrics(),
						serverIdle = await sample(true);
					let peakBrowserHeap = uiIdle.JSHeapUsedSize,
						peakNodes = uiIdle.Nodes,
						polling = false;
					const uiTimer = setInterval(async () => {
						if (polling) return;
						polling = true;
						try {
							const value = await page.metrics();
							peakBrowserHeap = Math.max(peakBrowserHeap, value.JSHeapUsedSize);
							peakNodes = Math.max(peakNodes, value.Nodes);
						} finally {
							polling = false;
						}
					}, 100);
					const uiStarted = performance.now();
					try {
						await page.click('header a[href="/profile"]');
						await page.waitForFunction(
							(expected) => document.querySelectorAll(".tutorList").length === expected,
							{ timeout: 30000 },
							variant === "baseline" ? count * 3 + 2 : 151
						);
						await page.waitForNetworkIdle();
					} finally {
						clearInterval(uiTimer);
						while (polling) await delay(10);
					}
					const uiElapsed = performance.now() - uiStarted,
						uiLoaded = await page.metrics(),
						serverLoaded = await sample();
					peakBrowserHeap = Math.max(peakBrowserHeap, uiLoaded.JSHeapUsedSize);
					peakNodes = Math.max(peakNodes, uiLoaded.Nodes);
					const rendered = await page.$$eval(".tutorList", (cards) => cards.length);
					await page.click('header a[href="/"]');
					await page.waitForFunction(() => document.querySelectorAll(".tutorList").length === 0);
					await delay(2000);
					const uiRecovered = await page.metrics(),
						serverRecovered = await sample();
					const ui = {
						initialDisplay:
							variant === "baseline"
								? "all accounts"
								: "first 50 of each role; all accounts remain searchable/pageable",
						renderedCards: rendered,
						elapsedMs: uiElapsed,
						idle: uiIdle,
						loaded: uiLoaded,
						recovered: uiRecovered,
						peakBrowserHeap,
						peakNodes,
						serverIdle,
						serverLoaded,
						serverRecovered
					};
					const acceptance = [];
					if (variant === "candidate" && pair === 0) {
						await page.click('header a[href="/profile"]');
						await page.waitForFunction(() => document.querySelectorAll(".tutorList").length === 151);
						await page.waitForNetworkIdle();
						const users = '.directory-controls[aria-label="users"]';
						await page.$eval(users + " > div button:nth-child(2)", (el) => el.click());
						await page.waitForFunction(() => document.body.innerText.includes("User 000050"));
						await page.$eval(users + " > div button:first-child", (el) => el.click());
						await page.waitForFunction(() => document.body.innerText.includes("User 000000"));
						await page.type(users + " input", "User " + String(count - 1).padStart(6, "0"));
						await page.$eval(users + " form", (form) => form.requestSubmit());
						await page.waitForFunction(
							(name) => document.body.innerText.includes(name),
							{},
							"User " + String(count - 1).padStart(6, "0")
						);
						acceptance.push("next/previous and search reach late records");
						await page.screenshot({ path: join(output, "candidate-directory.png"), fullPage: false });
						await page.click(".Signup .tutorList button.btn-primary");
						const input = ".Signup .tutorList input";
						const fill = async (value) => {
							await page.$eval(
								input,
								(el, text) => {
									el.value = text;
									el.dispatchEvent(new Event("input", { bubbles: true }));
								},
								value
							);
						};
						await fill("First submitted edit");
						holdWrite = true;
						const pending = new Promise((done) => {
							writeSeen = done;
						});
						await page.click(".Signup .tutorList button.btn-primary");
						await pending;
						await fill("Newer unsaved edit");
						holdWrite = false;
						await heldWrite.continue();
						await page.waitForFunction(() =>
							document.body.innerText.includes("newer edits are still unsaved")
						);
						assert.equal(await page.$eval(input, (el) => el.value), "Newer unsaved edit");
						page.once("dialog", (dialog) => dialog.dismiss());
						await page.click('header a[href="/"]');
						await delay(100);
						assert.equal(new URL(page.url()).pathname, "/profile");
						page.once("dialog", (dialog) => dialog.dismiss());
						await page.click("header button.btn-outline-danger");
						await delay(100);
						assert.ok(await page.$(input));
						page.once("dialog", (dialog) => dialog.accept());
						await page.click("header button.btn-outline-danger");
						await page.waitForSelector("header button.btn-outline-success");
						assert.equal(await page.$$eval(".tutorList", (cards) => cards.length), 0);
						acceptance.push(
							"new edits survive an earlier save",
							"cancelled navigation/logout preserve draft",
							"confirmed logout clears private cards"
						);
					}
					assert.deepEqual(errors, [], "compiled UI runtime errors");
					results.push({ pair, variant, legacy, ui, acceptance });
					await writeFile(
						join(output, "measurements.json"),
						JSON.stringify(
							{
								fixtureAccounts: count * 3 + 1,
								inputs,
								node: process.version,
								browser: await browser.version(),
								platform: process.platform,
								arch: process.arch,
								backendSampleMs: 20,
								browserSampleMs: 100,
								recoveryMs: 2000,
								results
							},
							null,
							2
						) + "\n"
					);
					console.log(
						JSON.stringify({
							pair,
							variant,
							legacyPeakRss: loaded.peakRss,
							uiServerPeakRss: serverLoaded.peakRss,
							uiPeakHeap: peakBrowserHeap,
							rendered,
							acceptance
						})
					);
				} finally {
					await browser?.close();
					if (profile) await rm(profile, { recursive: true, force: true });
					if (child.connected) child.send({ type: "stop" });
					const kill = setTimeout(() => child.kill("SIGKILL"), 10000);
					const status = await exited;
					clearTimeout(kill);
					proxy.closeAllConnections();
					await new Promise((done) => proxy.close(done));
					await database.dropDatabase();
					assert.deepEqual(status, { code: 0, signal: null }, stderr);
				}
			}
		}
	} finally {
		await client.close();
	}
}
