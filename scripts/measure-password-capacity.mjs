import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const [compiledDirectory, fixtureUri] = process.argv.slice(2);
assert.match(fixtureUri || "", /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test_[\w-]+$/);
const compiled = path.resolve(compiledDirectory);
const require = createRequire(path.join(compiled, "server.js"));
const mongoose = require("mongoose");
const { createAccount, serializeAccount } = await import(
	pathToFileURL(path.join(compiled, "services/accountService.js"))
);
const databaseModule = path.join(compiled, "databaseCapacity.js");
const options = existsSync(databaseModule)
	? (await import(pathToFileURL(databaseModule))).DATABASE_OPTIONS
	: { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, maxPoolSize: 20, minPoolSize: 0 };
const target = new URL(fixtureUri);
target.pathname = `/operation_security_test_${randomUUID().replaceAll("-", "")}`;
let peakRss = 0;
const sample = () => {
	const memory = process.memoryUsage();
	peakRss = Math.max(peakRss, memory.rss);
	return memory;
};
let timer;
try {
	await mongoose.connect(target.toString(), options);
	const User = mongoose.model("User"),
		Registry = mongoose.model("AccountEmail");
	await User.init();
	await Registry.init();
	const idle = sample();
	timer = setInterval(sample, 10);
	const password = "Synthetic-matched-password-work-123";
	async function create(index) {
		const started = performance.now();
		const account = await createAccount("user", {
			name: `Capacity ${index}`,
			email: `capacity-${index}@fixture.test`,
			password,
			age: "18",
			state: "Fixture"
		});
		const data = serializeAccount(account);
		assert.equal(data.name, `Capacity ${index}`);
		assert.equal(data.email, `capacity-${index}@fixture.test`);
		assert.equal(data.role, "user");
		assert.equal(data.password, undefined);
		return {
			latencyMs: performance.now() - started,
			record: { name: data.name, email: data.email, role: data.role },
			id: account._id
		};
	}
	await create("warm-1");
	await create("warm-2");
	const warm = sample(),
		cpuStarted = process.cpuUsage(),
		started = performance.now();
	const completed = await Promise.all(Array.from({ length: 12 }, (_, i) => create(i)));
	const elapsedMs = performance.now() - started,
		cpu = process.cpuUsage(cpuStarted),
		loaded = sample();
	for (const result of completed) {
		const account = await User.findById(result.id).select("+password");
		assert.equal(await account.comparePassword(password), true);
		assert.equal(await Registry.countDocuments({ accountId: result.id }), 1);
	}
	assert.equal(await User.countDocuments(), 14);
	await delay(2000);
	const recovered = sample();
	const latencies = completed.map((result) => result.latencyMs).sort((a, b) => a - b);
	const responseSha256 = createHash("sha256")
		.update(JSON.stringify(completed.map((result) => result.record)))
		.digest("hex");
	console.log(
		JSON.stringify({
			platform: process.platform,
			arch: process.arch,
			node: process.version,
			requests: 12,
			warmRequests: 2,
			concurrency: 12,
			idle,
			warm,
			loaded,
			recovered,
			peakRss,
			peakRssKiB: process.resourceUsage().maxRSS,
			elapsedMs,
			cpuMicros: cpu.user + cpu.system,
			p95Ms: latencies[Math.floor(latencies.length * 0.95)],
			responseSha256,
			verifiedPasswords: 12,
			verifiedIdentities: 12
		})
	);
} finally {
	clearInterval(timer);
	if (mongoose.connection.readyState !== 0) {
		await mongoose.connection.dropDatabase();
		await mongoose.disconnect();
	}
}
