import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { WorkflowCapacity } from "../services/workflowCapacity.js";

test("workflow admission is FIFO, bounded, and retains exclusivity through failures", async () => {
	const gate = new WorkflowCapacity(3);
	const release = Promise.withResolvers<void>();
	let active = 0;
	const order: number[] = [];
	const operations = Array.from({ length: 4 }, (_, index) => {
		return gate.run(async () => {
			assert.equal(active++, 0);
			order.push(index);
			await release.promise;
			active--;
			if (index === 0) throw new Error("synthetic failure");
			return index;
		});
	});
	const outcomes = Promise.allSettled(operations);
	assert.equal(gate.pending, 3);
	for (let i = 0; i < 200; i++) {
		await assert.rejects(
			gate.run(async () => assert.fail("overflow ran")),
			/temporarily busy/
		);
	}
	assert.equal(gate.pending, 3);
	release.resolve();
	assert.deepEqual(
		(await outcomes).map((value) => value.status),
		["rejected", "fulfilled", "fulfilled", "fulfilled"]
	);
	assert.deepEqual(order, [0, 1, 2, 3]);
	assert.equal(gate.pending, 0);
	assert.equal(await gate.run(async () => "recovered"), "recovered");
});

test("cancelled waiters release their closures and listeners without dropping accepted work", async () => {
	const gate = new WorkflowCapacity(2);
	const release = Promise.withResolvers<void>();
	const first = gate.run(() => release.promise);
	const cancelled = new AbortController();
	const waiting = gate.run(async () => assert.fail("cancelled operation ran"), cancelled.signal);
	const outcome = assert.rejects(waiting, /synthetic disconnect/);
	assert.equal(getEventListeners(cancelled.signal, "abort").length, 1);
	cancelled.abort(new Error("synthetic disconnect"));
	await outcome;
	assert.equal(gate.pending, 0);
	assert.equal(getEventListeners(cancelled.signal, "abort").length, 0);
	const admitted = new AbortController();
	const next = gate.run(async () => "next", admitted.signal);
	release.resolve();
	await first;
	assert.equal(await next, "next");
	assert.equal(getEventListeners(admitted.signal, "abort").length, 0);
	await assert.rejects(
		gate.run(async () => assert.fail("pre-aborted operation ran"), cancelled.signal),
		/synthetic disconnect/
	);
});

test("wait deadlines reject before execution and never expire an active operation", async () => {
	const gate = new WorkflowCapacity(1, 20);
	const release = Promise.withResolvers<void>();
	let finished = false;
	const first = gate.run(async () => {
		await release.promise;
		finished = true;
	});
	const controller = new AbortController();
	await assert.rejects(
		gate.run(async () => assert.fail("expired waiter ran"), controller.signal),
		/temporarily busy/
	);
	assert.equal(finished, false);
	assert.equal(gate.pending, 0);
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);
	await delay(30);
	assert.equal(finished, false);
	release.resolve();
	await first;
	assert.equal(finished, true);
	assert.equal(await gate.run(async () => "recovered"), "recovered");
});

test("a disconnect during accepted work does not admit another operation early", async () => {
	const gate = new WorkflowCapacity();
	const release = Promise.withResolvers<void>();
	const controller = new AbortController();
	const first = gate.run(() => release.promise, controller.signal);
	let entered = false;
	const second = gate.run(async () => {
		entered = true;
	});
	controller.abort(new Error("synthetic disconnect"));
	await delay(10);
	assert.equal(entered, false);
	release.resolve();
	await Promise.all([first, second]);
	assert.equal(entered, true);
	assert.equal(await gate.run(async () => "recovered"), "recovered");
});
