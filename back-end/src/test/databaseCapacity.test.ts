import type { Schema } from "mongoose";
import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { readCancellationPlugin, singleFlightReadiness } from "../databaseCapacity.js";

test(
	"readiness deadlines retain one underlying probe until settlement and then recover",
	{ timeout: 2000 },
	async () => {
		const held = Promise.withResolvers<boolean>();
		let attempts = 0;
		let firstSignal: AbortSignal | undefined;
		const check = singleFlightReadiness(async (signal) => {
			attempts++;
			firstSignal ??= signal;
			return attempts === 1 ? held.promise : true;
		}, 20);
		try {
			const first = check();
			assert.equal(check(), first);
			assert.equal(await first, false);
			assert.equal(firstSignal?.aborted, true);
			assert.equal(await check(), false);
			assert.equal(attempts, 1);
			held.resolve(true);
			await setImmediate();
			assert.equal(await check(), true);
			assert.equal(attempts, 2);
		} finally {
			held.resolve(false);
		}
	}
);

test("read hooks reject existing aborted signals before driver entry and preserve live signals", () => {
	interface Query {
		getOptions: () => { signal: AbortSignal };
		setOptions: (options: { signal: AbortSignal }) => void;
	}
	const hooks: Array<(this: Query) => void> = [];
	readCancellationPlugin({
		pre: (_operation: string, hook: (this: Query) => void) => hooks.push(hook)
	} as unknown as Schema);
	assert.ok(hooks.length > 0);
	const controller = new AbortController();
	let selected: AbortSignal | undefined;
	const query: Query = {
		getOptions: () => ({ signal: controller.signal }),
		setOptions: ({ signal }) => {
			selected = signal;
		}
	};
	for (const hook of hooks) {
		hook.call(query);
		assert.equal(selected, controller.signal);
	}
	const reason = new Error("cancelled fixture read");
	controller.abort(reason);
	for (const hook of hooks) {
		assert.throws(
			() => hook.call(query),
			(error) => error === reason
		);
	}
});
