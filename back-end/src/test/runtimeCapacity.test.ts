import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { Writable } from "node:stream";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import express from "express";
import { BoundedRateStore } from "../middleware/boundedRateStore.js";
import { hashPassword, PasswordCapacity, verifyPassword } from "../passwordWork.js";
import { RequestCapacity, trackHandler, trackSession } from "../runtimeCapacity.js";
import { createService } from "../serviceLifecycle.js";
import { ServiceLog } from "../serviceLog.js";

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

test("password work preserves Argon2 cost, bounds admission, and releases failed work", async () => {
	const gate = new PasswordCapacity(2, 2);
	const held = deferred();
	let active = 0;
	let peak = 0;
	const jobs = Array.from({ length: 4 }, (_, i) => {
		return gate.run(async () => {
			active++;
			peak = Math.max(peak, active);
			await held.promise;
			active--;
			if (i === 0) throw new Error("fixture failure");
			return i;
		});
	});
	const settled = Promise.allSettled(jobs);
	await assert.rejects(
		gate.run(async () => 5),
		/temporarily busy/
	);
	assert.equal(active, 2);
	held.resolve();
	assert.equal((await settled).filter((r) => r.status === "fulfilled").length, 3);
	assert.equal(peak, 2);
	assert.equal(await gate.run(async () => 6), 6);
	const hash = await hashPassword("Synthetic-native-hash-fixture-123");
	assert.match(hash, /^\$argon2id\$v=19\$/);
	assert.deepEqual(
		Object.fromEntries(
			hash
				.split("$")[3]!
				.split(",")
				.map((value) => value.split("="))
		),
		{ m: "65536", t: "3", p: "1" }
	);
	assert.equal(await verifyPassword(hash, "Synthetic-native-hash-fixture-123"), true);
	assert.equal(await verifyPassword(hash, "wrong"), false);
});

test("rate counters preserve live windows and bound churn with an independent overflow bucket", () => {
	let now = 1000;
	const store = new BoundedRateStore(2, () => now);
	const first = store.increment("a");
	const second = store.increment("b");
	for (let i = 0; i < 20000; i++) assert.equal(store.increment(`new-${i}`).totalHits, i + 1);
	assert.equal(store.increment("a").totalHits, 2);
	assert.equal(store.increment("b").resetTime?.getTime(), second.resetTime?.getTime());
	store.decrement("unknown");
	assert.equal(store.increment("extra").totalHits, 20001);
	now = first.resetTime!.getTime();
	assert.equal(store.increment("a").totalHits, 1);
	now -= 5000;
	assert.equal(store.increment("a").totalHits, 2);
	store.shutdown();
	assert.equal(store.increment("a").totalHits, 1);
});

test("disconnected writes keep admission and drain through repeated shutdown before disposal", async () => {
	const capacity = new RequestCapacity(1);
	const held = deferred();
	const started = deferred();
	const records: string[] = [];
	let committed = false;
	let disposed = false;
	const log = new ServiceLog(
		new Writable({
			write(chunk, _encoding, callback) {
				records.push(String(chunk));
				callback();
			}
		})
	);
	const app = express();
	app.use(capacity.middleware);
	app.post(
		"/write",
		trackHandler(async (_req, res) => {
			started.resolve();
			await held.promise;
			committed = true;
			log.write({ event: "accepted-write", success: true });
			res.json({ ok: true });
		})
	);
	const service = createService({
		host: "127.0.0.1",
		port: 0,
		capacity,
		log,
		initialize: async () => app,
		dispose: async () => {
			assert.equal(committed, true);
			disposed = true;
		}
	});
	await service.start();
	const address = service.address();
	assert.ok(address && typeof address !== "string");
	const url = `http://127.0.0.1:${address.port}`;
	const request = httpRequest(`${url}/write`, { method: "POST" });
	request.on("error", () => {});
	request.end();
	try {
		await started.promise;
		request.destroy();
		await delay(20);
		assert.equal(capacity.activeRequests, 1);
		assert.equal((await fetch(`${url}/write`, { method: "POST" })).status, 503);
		const first = service.shutdown("SIGTERM");
		assert.equal(service.shutdown("SIGTERM"), first);
		await delay(20);
		assert.equal(disposed, false);
		held.resolve();
		assert.equal(await first, 0);
		assert.equal(disposed, true);
		assert.equal(capacity.activeRequests, 0);
		assert.ok(records.some((record) => record.includes("accepted-write")));
	} finally {
		held.resolve();
		request.destroy();
		await service.shutdown("cleanup");
	}
});

test("a disconnected session lookup remains counted and cannot launch a later handler", async () => {
	const capacity = new RequestCapacity(1);
	const started = deferred();
	let finish!: () => void;
	let reached = false;
	const app = express();
	app.use(capacity.middleware);
	app.use(
		trackSession((_req, _res, next) => {
			finish = () => next();
			started.resolve();
		})
	);
	app.get("/", () => {
		reached = true;
	});
	const server = createServer(app);
	await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
	const address = server.address();
	assert.ok(address && typeof address !== "string");
	const request = httpRequest(`http://127.0.0.1:${address.port}`);
	request.on("error", () => {});
	request.end();
	try {
		await started.promise;
		request.destroy();
		await delay(20);
		assert.equal(capacity.activeRequests, 1);
		finish();
		await capacity.drain();
		assert.equal(reached, false);
	} finally {
		server.closeAllConnections();
		await new Promise<void>((done) => server.close(() => done()));
	}
});

test("stalled logging pauses admission then drains every accepted record", async () => {
	let release: (() => void) | undefined;
	const received: string[] = [];
	const stream = new Writable({
		write(chunk, _encoding, callback) {
			received.push(String(chunk));
			release = callback;
		}
	});
	const log = new ServiceLog(stream);
	let count = 0;
	while (log.ready) {
		assert.equal(log.write({ event: "fixture", padding: "x".repeat(2000) }), true);
		count++;
	}
	assert.ok(log.pendingBytes < 70000);
	const drained = log.drain();
	while (log.pendingBytes) {
		const callback = release;
		release = undefined;
		assert.ok(callback);
		callback();
		await delay(0);
	}
	await drained;
	assert.equal(received.length, count);
	assert.equal(log.ready, true);
	stream.destroy(new Error("fixture unavailable"));
	await delay(0);
	assert.equal(log.ready, false);
});

test("startup and cleanup failures remain failures; shutdown deadline is bounded", async () => {
	const log = new ServiceLog(
		new Writable({
			write(_chunk, _encoding, callback) {
				callback();
			}
		})
	);
	let disposed = false;
	const failed = createService({
		host: "127.0.0.1",
		port: 0,
		capacity: new RequestCapacity(),
		log,
		initialize: async () => {
			throw new Error("partial startup");
		},
		dispose: async () => {
			disposed = true;
			throw new Error("dispose failure");
		}
	});
	await assert.rejects(failed.start(), /partial startup/);
	assert.equal(await failed.shutdown("failure"), 1);
	assert.equal(disposed, true);
	const held = deferred();
	const timed = createService({
		host: "127.0.0.1",
		port: 0,
		capacity: new RequestCapacity(),
		log,
		initialize: async () => express(),
		dispose: async () => held.promise,
		shutdownMs: 20
	});
	await timed.start();
	assert.equal(await timed.shutdown("deadline"), 1);
	held.resolve();
	await assert.rejects(timed.start(), /already stopping/);
});
