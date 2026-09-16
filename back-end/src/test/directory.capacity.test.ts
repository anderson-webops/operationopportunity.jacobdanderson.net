import type { Model } from "mongoose";
import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import express from "express";
import { Types } from "mongoose";
import { AdminWorkflowLock } from "../models/schemas/AdminWorkflowLock.js";
import { RequestCapacity, trackHandler } from "../runtimeCapacity.js";
import { withAuthorizationWorkflowLock } from "../services/adminWorkflow.js";
import { sendDirectory } from "../services/directory.js";

test(
	"a slow legacy client backpressures its cursor and disconnect releases it and admission",
	{ timeout: 5000 },
	async () => {
		let read = 0;
		let closed = false;
		let signal: AbortSignal | undefined;
		const rows = Object.assign(
			(async function* () {
				for (let index = 0; index < 100000; index++) {
					read++;
					yield {
						_id: new Types.ObjectId(),
						name: "x".repeat(100),
						email: "fixture@fixture.test",
						state: "GA"
					};
				}
			})(),
			{
				close: async () => {
					closed = true;
				}
			}
		);
		const query = {
			select: () => query,
			sort: () => query,
			setOptions: (options: { signal: AbortSignal }) => {
				signal = options.signal;
				return query;
			},
			cursor: () => rows
		};
		const capacity = new RequestCapacity(1);
		const app = express();
		app.use(capacity.middleware);
		app.get(
			"/",
			trackHandler(async (req, res) => {
				await sendDirectory(req, res, { public: true, model: { find: () => query } as unknown as Model<any> });
			})
		);
		const server = createServer(app);
		await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
		const address = server.address();
		assert.ok(address && typeof address !== "string");
		const request = httpRequest(`http://127.0.0.1:${address.port}`);
		request.on("error", () => {});
		const started = new Promise<void>((done) =>
			request.once("response", (response) => {
				response.pause();
				done();
			})
		);
		request.end();
		try {
			await started;
			await delay(80);
			assert.ok(read > 0 && read < 100000, `unexpected read-ahead ${read}`);
			assert.equal(closed, false);
			request.destroy();
			await Promise.race([
				capacity.drain(),
				delay(1000).then(() => {
					throw new Error("abandoned cursor did not drain");
				})
			]);
			assert.equal(closed, true);
			assert.equal(signal?.aborted, true);
			assert.equal(capacity.activeRequests, 0);
		} finally {
			request.destroy();
			server.closeAllConnections();
			await new Promise<void>((done) => server.close(() => done()));
		}
	}
);

test(
	"a disconnected reader stops authorization-lock backoff without running or deleting another owner's lock",
	{ timeout: 5000 },
	async (context) => {
		let attempts = 0;
		let operationRan = false;
		let deleted = false;
		let begin!: () => void;
		const started = new Promise<void>((resolve) => {
			begin = resolve;
		});
		context.mock.method(AdminWorkflowLock, "findOneAndUpdate", () => ({
			lean: () => ({
				exec: async () => {
					attempts++;
					begin();
					throw Object.assign(new Error("held"), { code: 11000 });
				}
			})
		}));
		context.mock.method(AdminWorkflowLock, "deleteOne", async () => {
			deleted = true;
		});
		const capacity = new RequestCapacity(1);
		const app = express();
		app.use(capacity.middleware);
		app.get(
			"/",
			trackHandler(async (_req, res) => {
				try {
					await withAuthorizationWorkflowLock(async () => {
						operationRan = true;
					});
					res.end();
				} catch {
					res.destroy();
				}
			})
		);
		const server = createServer(app);
		await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
		const address = server.address();
		assert.ok(address && typeof address !== "string");
		const request = httpRequest(`http://127.0.0.1:${address.port}`);
		request.on("error", () => {});
		request.end();
		try {
			await started;
			request.destroy();
			await Promise.race([
				capacity.drain(),
				delay(500).then(() => {
					throw new Error("abandoned lock wait did not drain");
				})
			]);
			const stoppedAt = attempts;
			await delay(120);
			assert.equal(attempts, stoppedAt);
			assert.ok(attempts < 5);
			assert.equal(operationRan, false);
			assert.equal(deleted, false);
		} finally {
			request.destroy();
			server.closeAllConnections();
			await new Promise<void>((done) => server.close(() => done()));
		}
	}
);
