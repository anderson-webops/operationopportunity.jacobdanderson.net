import assert from "node:assert/strict";
import { execFileSync, fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

// Reproduction: node scripts/measure-workflow-runtime.mjs BASELINE CANDIDATE
// mongodb://127.0.0.1:PORT/operation_security_test OUTPUT.json [PAIRS]
// Seeding and load generation are outside the measured compiled API process.
const script = fileURLToPath(import.meta.url);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const p95 = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];
if (process.argv[2] === "child") {
	const [, , , root, uri] = process.argv;
	assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test_wf_[a-f0-9]+$/);
	const require = createRequire(join(root, "package.json")),
		mongoose = require("mongoose");
	const at = (name) => import(pathToFileURL(join(root, "back-end/dist", name)));
	const { createApp } = await at("app.js"),
		{ DATABASE_OPTIONS } = await at("databaseCapacity.js");
	const { withAuthorizationWorkflowLock, requireCurrentAdminManager } = await at("services/adminWorkflow.js");
	const { Admin } = await at("models/schemas/Admin.js");
	await mongoose.connect(uri, { ...DATABASE_OPTIONS, monitorCommands: true });
	await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
	let acquisitionCommands = 0;
	mongoose.connection.getClient().on("commandStarted", (event) => {
		if (event.commandName === "findAndModify") acquisitionCommands++;
	});
	const app = createApp({
		environment: "test",
		isProduction: false,
		host: "127.0.0.1",
		port: 0,
		publicOrigin: "http://localhost:3333",
		trustedProxyIps: [],
		sessionSecrets: ["synthetic-workflow-session-".padEnd(48, "s")],
		sessionCookieName: "fixture.sid",
		sessionMaxAgeMs: 60000,
		sessionRememberMaxAgeMs: 60000,
		mongoUri: uri,
		allowUnauthenticatedLoopbackMongo: true,
		enableInternalDiagnostics: false,
		quotesUpstreamUrl: new URL("http://127.0.0.1:9"),
		requestBodyLimit: "64kb"
	});
	const server = http.createServer(app);
	await new Promise((done) => server.listen(0, "127.0.0.1", done));
	let peakRss = 0,
		peakHeap = 0;
	const sample = () => {
		const memory = process.memoryUsage();
		peakRss = Math.max(peakRss, memory.rss);
		peakHeap = Math.max(peakHeap, memory.heapUsed);
		return {
			...memory,
			peakRss,
			peakHeap,
			acquisitionCommands,
			activeRequests: app.get("capacity").activeRequests
		};
	};
	const timer = setInterval(sample, 10);
	process.on("message", async (message) => {
		try {
			if (message.type === "sample") {
				if (message.reset) {
					peakRss = peakHeap = acquisitionCommands = 0;
				}
				process.send({ type: "sample", memory: sample() });
			}
			if (message.type === "workflows") {
				const timings = [],
					started = performance.now();
				for (let batch = 0; batch < 3; batch++) {
					await Promise.all(
						Array.from({ length: 32 }, async (_, index) => {
							const at = performance.now();
							await withAuthorizationWorkflowLock(async () => {
								await requireCurrentAdminManager("000000000000000000000001", 0);
								await delay(10);
								await Admin.updateOne(
									{ _id: new mongoose.Types.ObjectId("000000000000000000000001") },
									{ $set: { name: `Synthetic ${batch}-${index}` } }
								);
							});
							timings.push(performance.now() - at);
						})
					);
				}
				process.send({
					type: "workflows",
					completed: timings.length,
					elapsedMs: performance.now() - started,
					p95Ms: p95(timings),
					memory: sample()
				});
			}
			if (message.type === "stop") {
				clearInterval(timer);
				app.get("capacity").stop();
				server.closeIdleConnections();
				await new Promise((done) => server.close(done));
				await app.get("capacity").drain();
				await mongoose.disconnect();
				process.exit(0);
			}
		} catch (error) {
			console.error(error);
			process.exitCode = 1;
			process.send({ type: "error", message: String(error) });
		}
	});
	process.send({ type: "ready", port: server.address().port });
} else {
	const [, , baselineArg, candidateArg, uri, outputArg, pairsArg = "3"] = process.argv;
	assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test$/);
	const baseline = resolve(baselineArg),
		candidate = resolve(candidateArg),
		output = resolve(outputArg);
	assert.ok(output.startsWith(join(candidate, ".ai-work/runs/")));
	const require = createRequire(join(candidate, "package.json")),
		{ MongoClient, ObjectId } = require("mongodb");
	const inputs = {};
	for (const [variant, root] of Object.entries({ baseline, candidate })) {
		const files = [];
		async function collect(directory) {
			for (const entry of (await readdir(join(root, directory), { withFileTypes: true })).sort((a, b) =>
				a.name.localeCompare(b.name)
			)) {
				const path = join(directory, entry.name);
				if (entry.isDirectory()) await collect(path);
				else if (entry.isFile()) files.push([path, hash(await readFile(join(root, path)))]);
				else assert.fail("Unexpected compiled link");
			}
		}
		await collect("back-end/dist");
		inputs[variant] = {
			commit: execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
			trackedChanges: execFileSync("git", ["-C", root, "status", "--porcelain", "--untracked-files=no"], {
				encoding: "utf8"
			}).trim(),
			compiledTreeSha256: hash(JSON.stringify(files)),
			files,
			rootLockSha256: hash(await readFile(join(root, "package-lock.json"))),
			backendLockSha256: hash(await readFile(join(root, "back-end/package-lock.json")))
		};
	}
	const runs = [];
	for (let pair = 0; pair < Number(pairsArg); pair++) {
		for (const variant of pair % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"]) {
			const target = new URL(uri);
			target.pathname = `/operation_security_test_wf_${randomUUID().replaceAll("-", "")}`;
			const client = new MongoClient(target.toString());
			await client.connect();
			const db = client.db();
			let child;
			try {
				await db.collection("admins").insertOne({
					_id: new ObjectId("000000000000000000000001"),
					name: "Synthetic",
					email: "manager@fixture.test",
					role: "admin",
					editAdmins: true,
					authVersion: 0
				});
				for (let batch = 0; batch < 31; batch++) {
					const count = batch < 30 ? 1000 : 300;
					await db.collection("tutors").insertMany(
						Array.from({ length: count }, (_, offset) => {
							const index = batch * 1000 + offset;
							return {
								_id: new ObjectId((index + 2).toString(16).padStart(24, "0")),
								name: `${batch < 30 ? "A Hidden" : "Z Active"} ${String(index).padStart(6, "0")}`,
								email: `synthetic-${index}@fixture.test`,
								state: "GA",
								status: batch < 30 ? (index % 2 ? "pending" : "suspended") : "active",
								role: "tutor",
								authVersion: 0
							};
						})
					);
				}
				child = fork(script, ["child", variant === "baseline" ? baseline : candidate, target.toString()], {
					stdio: ["ignore", "ignore", "inherit", "ipc"]
				});
				const exited = new Promise((resolveExit) =>
					child.once("exit", (code, signal) => resolveExit({ code, signal }))
				);
				const receive = (type) =>
					new Promise((done, reject) => {
						const timeout = setTimeout(() => finish(new Error(`Timed out: ${type}`)), 60000);
						const message = (value) => {
							if (value.type === type) finish(null, value);
							else if (value.type === "error") finish(new Error(value.message));
						};
						const ended = () => finish(new Error(`Child exited before ${type}`));
						function finish(error, value) {
							clearTimeout(timeout);
							child.off("message", message);
							child.off("exit", ended);
							if (error) reject(error);
							else done(value);
						}
						child.on("message", message);
						child.once("exit", ended);
					});
				const call = async (type, args = {}) => {
					const pending = receive(type);
					child.send({ type, ...args });
					return pending;
				};
				const ready = await receive("ready"),
					base = `http://127.0.0.1:${ready.port}`;
				const page = async () => {
					const at = performance.now(),
						response = await fetch(base + "/tutors?pageSize=50", { signal: AbortSignal.timeout(10000) });
					assert.equal(response.status, 200);
					const value = await response.json();
					assert.equal(value.items.length, 50);
					assert.ok(
						value.items.every(
							(row) =>
								row.name.startsWith("Z Active") && Object.keys(row).sort().join() === "_id,name,state"
						)
					);
					return { ms: performance.now() - at, digest: hash(JSON.stringify(value)) };
				};
				const idle = (await call("sample", { reset: true })).memory;
				await page();
				const warmed = (await call("sample", { reset: true })).memory;
				const timings = [],
					started = performance.now();
				for (let batch = 0; batch < 15; batch++)
					timings.push(...(await Promise.all(Array.from({ length: 4 }, page))));
				const publicElapsed = performance.now() - started,
					loaded = (await call("sample")).memory;
				await delay(2000);
				const recovered = (await call("sample")).memory;
				const plan = await db
					.collection("tutors")
					.find({ $and: [{ status: "active" }] })
					.project({ _id: 1, name: 1, state: 1 })
					.sort({ name: 1, _id: 1 })
					.limit(51)
					.explain("executionStats");
				assert.equal(new Set(timings.map((value) => value.digest)).size, 1);
				const workflowIdle = (await call("sample", { reset: true })).memory;
				const workflow = await call("workflows");
				await delay(2000);
				const workflowRecovered = (await call("sample")).memory;
				const result = {
					pair,
					variant,
					public: {
						idle,
						warmed,
						loaded,
						recovered,
						elapsedMs: publicElapsed,
						p95Ms: p95(timings.map((value) => value.ms)),
						responseSha256: timings[0].digest,
						completed: timings.length,
						plan: {
							returned: plan.executionStats.nReturned,
							documents: plan.executionStats.totalDocsExamined,
							keys: plan.executionStats.totalKeysExamined,
							winning: plan.queryPlanner.winningPlan
						}
					},
					workflow: { idle: workflowIdle, ...workflow, recovered: workflowRecovered }
				};
				runs.push(result);
				child.send({ type: "stop" });
				assert.deepEqual(await exited, { code: 0, signal: null });
				console.log(
					JSON.stringify({
						pair,
						variant,
						publicP95: result.public.p95Ms,
						documents: result.public.plan.documents,
						workflowP95: workflow.p95Ms,
						acquisitionCommands: workflow.memory.acquisitionCommands
					})
				);
				await writeFile(
					output,
					JSON.stringify(
						{
							runtime: process.version,
							platform: process.platform,
							arch: process.arch,
							inactiveTutors: 30000,
							activeTutors: 300,
							workflowBatches: 3,
							workflowConcurrency: 32,
							recoverySeconds: 2,
							inputs,
							runs
						},
						null,
						2
					) + "\n"
				);
			} finally {
				if (child && child.exitCode === null && child.signalCode === null) {
					child.kill("SIGTERM");
					await new Promise((done) => child.once("exit", done));
				}
				await db.dropDatabase();
				await client.close();
			}
		}
	}
	assert.equal(new Set(runs.map((run) => run.public.responseSha256)).size, 1);
}
