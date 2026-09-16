import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

// Synthetic-only paired startup measurement. Fixture seeding and semantic
// verification occur in the parent, outside the measured process.
const script = fileURLToPath(import.meta.url);
const roles = ["admin", "tutor", "user"];
const collections = ["admins", "tutors", "users"];
if (process.argv[2] === "worker") {
	const [, , , root, uri, temporary] = process.argv;
	assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test_measure_[a-f0-9]+$/);
	const require = createRequire(join(root, "package.json"));
	const mongoose = require("mongoose");
	const moduleAt = (path) => import(pathToFileURL(join(root, "back-end/dist", path)).href);
	const { DATABASE_OPTIONS } = await moduleAt("databaseCapacity.js");
	const { ensureIdentityRegistry } = await moduleAt("services/identityRegistry.js");
	await mongoose.connect(uri, { ...DATABASE_OPTIONS, monitorCommands: true });
	await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
	const commands = {};
	let peakRss = 0,
		peakHeap = 0,
		peakScratch = 0;
	const sample = () => {
		const { rss, heapUsed } = process.memoryUsage();
		peakRss = Math.max(peakRss, rss);
		peakHeap = Math.max(peakHeap, heapUsed);
		let scratch = 0;
		for (const dir of readdirSync(temporary)) {
			for (const file of readdirSync(join(temporary, dir))) scratch += statSync(join(temporary, dir, file)).size;
		}
		peakScratch = Math.max(peakScratch, scratch);
		return { rss, heapUsed };
	};
	await delay(200);
	const idle = sample();
	mongoose.connection.getClient().on("commandStarted", (event) => {
		commands[event.commandName] = (commands[event.commandName] || 0) + 1;
	});
	const timer = setInterval(sample, 20);
	const started = performance.now();
	await ensureIdentityRegistry();
	const elapsedMs = performance.now() - started;
	const warmed = sample();
	await delay(1000);
	const recovered = sample();
	clearInterval(timer);
	assert.deepEqual(await readdir(temporary), []);
	const result = {
		elapsedMs,
		idle,
		warmed,
		recovered,
		peakRss,
		peakHeap,
		peakScratch,
		commands,
		processHighWaterRss: process.resourceUsage().maxRSS * 1024,
		sampleIntervalMs: 20,
		recoveryMs: 1000
	};
	await mongoose.disconnect();
	console.log(JSON.stringify(result));
} else {
	const [, , baselineArg, candidateArg, uri, outputArg] = process.argv;
	assert.ok(uri && /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test$/.test(uri));
	const baseline = resolve(baselineArg),
		candidate = resolve(candidateArg),
		output = resolve(outputArg);
	assert.ok(output.startsWith(join(candidate, ".ai-work/runs/")));
	await mkdir(output, { recursive: true });
	const require = createRequire(join(candidate, "package.json"));
	const { MongoClient, ObjectId } = require("mongoose").mongo;
	const control = new MongoClient(uri, { timeoutMS: 10000, maxPoolSize: 2 });
	await control.connect();
	const results = [];
	try {
		for (const scenario of [
			{ name: "valid-registry", count: 30000 },
			{ name: "legacy-repair", count: 3000 }
		]) {
			for (let pair = 0; pair < 3; pair++) {
				for (const variant of pair % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"]) {
					const name = `operation_security_test_measure_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
					const database = control.db(name);
					const temporary = join(output, name);
					await mkdir(temporary, { mode: 0o700 });
					try {
						for (let offset = 0; offset < scenario.count; offset += 300) {
							const accounts = roles.map(() => []),
								identities = [];
							for (let i = offset; i < Math.min(offset + 300, scenario.count); i++) {
								const roleIndex = i % 3;
								const _id = new ObjectId((i + 1).toString(16).padStart(24, "0"));
								const email = `fixture-${String(i).padStart(8, "0")}@example.test`;
								accounts[roleIndex].push({
									_id,
									email: scenario.name === "legacy-repair" ? ` ${email.toUpperCase()} ` : email,
									name: "Synthetic fixture",
									role: roles[roleIndex]
								});
								if (scenario.name === "valid-registry" || i % 2 === 0)
									identities.push({ _id: email, role: roles[roleIndex], accountId: _id });
							}
							for (let r = 0; r < roles.length; r++)
								await database.collection(collections[r]).insertMany(accounts[r]);
							await database.collection("accountemails").insertMany(identities);
						}
						const target = new URL(uri);
						target.pathname = `/${name}`;
						const child = spawn(
							process.execPath,
							[
								script,
								"worker",
								variant === "baseline" ? baseline : candidate,
								target.toString(),
								temporary
							],
							{
								env: { ...process.env, TMPDIR: temporary },
								stdio: ["ignore", "pipe", "pipe"]
							}
						);
						let stdout = "",
							stderr = "";
						child.stdout.on("data", (data) => {
							stdout += data;
							assert.ok(stdout.length < 65536);
						});
						child.stderr.on("data", (data) => {
							stderr = (stderr + data).slice(-8192);
						});
						const kill = setTimeout(() => child.kill("SIGKILL"), 180000);
						try {
							const code = await new Promise((resolve, reject) => {
								child.once("error", reject);
								child.once("exit", resolve);
							});
							assert.equal(code, 0, stderr);
						} finally {
							clearTimeout(kill);
						}
						const digest = createHash("sha256");
						const counts = {};
						for (const collection of [...collections, "accountemails"]) {
							counts[collection] = 0;
							for await (const row of database
								.collection(collection)
								.find()
								.sort({ _id: 1 })
								.batchSize(128)) {
								counts[collection]++;
								if (row.email) assert.equal(row.email, row.email.trim().toLowerCase());
								digest.update(
									JSON.stringify([
										collection,
										row._id.toString(),
										row.email || "",
										row.role,
										row.accountId?.toString() || ""
									]) + "\n"
								);
							}
						}
						assert.equal(counts.accountemails, scenario.count);
						for (const collection of collections) assert.equal(counts[collection], scenario.count / 3);
						const result = {
							scenario: scenario.name,
							accounts: scenario.count,
							pair,
							variant,
							...JSON.parse(stdout),
							counts,
							semanticSha256: digest.digest("hex")
						};
						results.push(result);
						await writeFile(
							join(output, "startup-measurements.json"),
							JSON.stringify(
								{ node: process.version, platform: process.platform, arch: process.arch, results },
								null,
								2
							) + "\n"
						);
						console.log(
							JSON.stringify({
								scenario: result.scenario,
								pair,
								variant,
								elapsedMs: result.elapsedMs,
								peakRss: result.peakRss,
								peakScratch: result.peakScratch
							})
						);
					} finally {
						await database.dropDatabase();
						await rm(temporary, { recursive: true, force: true });
					}
				}
			}
			assert.equal(
				new Set(results.filter((r) => r.scenario === scenario.name).map((r) => r.semanticSha256)).size,
				1
			);
		}
	} finally {
		await control.close();
	}
}
