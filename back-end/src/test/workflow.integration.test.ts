import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, request } from "node:http";
import process from "node:process";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import express from "express";
import mongoose from "mongoose";
import { DATABASE_OPTIONS } from "../databaseCapacity.js";
import { Admin } from "../models/schemas/Admin.js";
import { AdminWorkflowLock } from "../models/schemas/AdminWorkflowLock.js";
import { RequestCapacity, trackHandler } from "../runtimeCapacity.js";
import { requireCurrentAdminManager, withAuthorizationWorkflowLock } from "../services/adminWorkflow.js";

const fixture = process.env.TEST_MONGODB_URI;
test(
	"authorization serialization outlives Mongo lease expiry and bounds contention",
	{ skip: !fixture, timeout: 25000 },
	async (context) => {
		assert.ok(fixture && /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test/.test(fixture));
		const uri = new URL(fixture);
		uri.pathname = `/operation_security_test_${randomUUID().replaceAll("-", "")}`;
		const application = `workflow-${randomUUID()}`;
		await mongoose.connect(uri.toString(), { ...DATABASE_OPTIONS, monitorCommands: true, appName: application });
		context.after(async () => {
			await mongoose.connection.dropDatabase();
			await mongoose.disconnect();
		});
		await Promise.all([Admin.init(), AdminWorkflowLock.init()]);
		const id = new mongoose.Types.ObjectId();
		await Admin.collection.insertOne({
			_id: id,
			name: "Synthetic manager",
			email: "workflow@fixture.test",
			editAdmins: true,
			authVersion: 0,
			role: "admin"
		});
		await context.test(
			"expired lease cannot admit a stale manager while the preceding operation runs",
			async () => {
				const held = Promise.withResolvers<void>();
				const release = Promise.withResolvers<void>();
				const first = withAuthorizationWorkflowLock(async () => {
					held.resolve();
					await release.promise;
					await Admin.updateOne({ _id: id }, { $set: { editAdmins: false, authVersion: 1 } });
				});
				let secondEntered = false;
				let acquisitionCommands = 0;
				const count = (event: { commandName: string }) => {
					if (event.commandName === "findAndModify") acquisitionCommands++;
				};
				try {
					await held.promise;
					// Baseline was also reproduced using natural 30-second expiry. Make the
					// same persisted condition immediate here so every release can test it.
					await AdminWorkflowLock.updateOne(
						{ _id: "authorization-workflow" },
						{ $set: { expiresAt: new Date(0) } }
					);
					mongoose.connection.getClient().on("commandStarted", count);
					const second = withAuthorizationWorkflowLock(async () => {
						secondEntered = true;
						await requireCurrentAdminManager(id.toString(), 0);
					});
					const rejected = assert.rejects(
						second,
						(error: unknown) =>
							error instanceof Error && "code" in error && error.code === "session_expired"
					);
					await delay(150);
					assert.equal(secondEntered, false);
					assert.equal(acquisitionCommands, 0, "local waiters must not poll Mongo");
					release.resolve();
					await Promise.all([first, rejected]);
					assert.equal(secondEntered, true);
					assert.equal(acquisitionCommands, 1);
					assert.equal(await AdminWorkflowLock.countDocuments(), 0);
				} finally {
					release.resolve();
					await first;
					mongoose.connection.getClient().off("commandStarted", count);
				}
			}
		);
		await context.test(
			"external lock contention has one total deadline and recovers without stealing ownership",
			async () => {
				await AdminWorkflowLock.create({
					_id: "authorization-workflow",
					owner: "synthetic-other-process",
					expiresAt: new Date(Date.now() + 30000)
				});
				const started = performance.now();
				await assert.rejects(
					withAuthorizationWorkflowLock(async () => assert.fail("foreign lock stolen")),
					/temporarily busy/
				);
				assert.ok(performance.now() - started < 6500, "queue/acquisition deadline was not bounded");
				assert.equal(
					(await AdminWorkflowLock.findById("authorization-workflow"))?.owner,
					"synthetic-other-process"
				);
				await AdminWorkflowLock.deleteOne({ _id: "authorization-workflow", owner: "synthetic-other-process" });
				assert.equal(await withAuthorizationWorkflowLock(async () => "recovered"), "recovered");
			}
		);
		await context.test(
			"disconnected queued reads stop; accepted writes retain admission until settled",
			async () => {
				const capacity = new RequestCapacity();
				const app = express();
				let readEntered = false;
				app.use(capacity.middleware);
				app.get(
					"/read",
					trackHandler(async (_req, res) => {
						await withAuthorizationWorkflowLock(async () => {
							readEntered = true;
						});
						res.json({ ok: true });
					})
				);
				app.post(
					"/write",
					trackHandler(async (_req, res) => {
						await withAuthorizationWorkflowLock(async () => {
							await Admin.updateOne({ _id: id }, { $set: { name: "Accepted after disconnect" } });
						});
						res.json({ ok: true });
					})
				);
				app.use(
					(_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
						if (!res.destroyed) res.status(503).end();
					}
				);
				const server = createServer(app);
				await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
				const address = server.address();
				assert.ok(address && typeof address !== "string");
				const held = Promise.withResolvers<void>();
				const release = Promise.withResolvers<void>();
				const first = withAuthorizationWorkflowLock(async () => {
					held.resolve();
					await release.promise;
				});
				const waitForActive = async (expected: number) => {
					for (let tries = 0; tries < 100 && capacity.activeRequests !== expected; tries++) await delay(10);
					assert.equal(capacity.activeRequests, expected);
				};
				try {
					await held.promise;
					const read = request(`http://127.0.0.1:${address.port}/read`);
					read.on("error", () => {});
					read.end();
					await waitForActive(1);
					read.destroy();
					await waitForActive(0);
					assert.equal(readEntered, false);
					const write = request(`http://127.0.0.1:${address.port}/write`, { method: "POST" });
					write.on("error", () => {});
					write.end();
					await waitForActive(1);
					write.destroy();
					await delay(50);
					assert.equal(capacity.activeRequests, 1);
					release.resolve();
					await first;
					await capacity.drain();
					assert.equal((await Admin.findById(id))?.name, "Accepted after disconnect");
				} finally {
					release.resolve();
					await first;
					server.closeAllConnections();
					await new Promise<void>((done) => server.close(() => done()));
				}
			}
		);
		await context.test(
			"slow duplicate-lock responses cannot multiply the acquisition deadline",
			{ skip: !process.env.MONGO_FAULT_TEST_URI },
			async () => {
				const controlUri = process.env.MONGO_FAULT_TEST_URI!;
				assert.match(controlUri, /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test/);
				const control = new mongoose.mongo.MongoClient(controlUri, {
					timeoutMS: 10000,
					appName: "fixture-controller"
				});
				await control.connect();
				const controlAdmin = control.db("admin");
				await AdminWorkflowLock.create({
					_id: "authorization-workflow",
					owner: "synthetic-slow-owner",
					expiresAt: new Date(Date.now() + 30000)
				});
				try {
					await controlAdmin.command({
						configureFailPoint: "failCommand",
						mode: "alwaysOn",
						data: {
							appName: application,
							failCommands: ["findAndModify"],
							blockConnection: true,
							blockTimeMS: 2000
						}
					});
					const started = performance.now();
					await assert.rejects(
						withAuthorizationWorkflowLock(async () => assert.fail("failed lock acquired")),
						/temporarily busy/
					);
					assert.ok(performance.now() - started < 6500);
				} finally {
					await controlAdmin.command({ configureFailPoint: "failCommand", mode: "off" });
					// A client timeout does not prove the server stopped its command.
					// Drain this fixture's server operations before removing its owner.
					let inFlight = true;
					for (let attempt = 0; attempt < 300 && inFlight; attempt++) {
						const current = await controlAdmin.command({ currentOp: 1, active: true });
						inFlight = current.inprog.some(
							(operation: { appName?: string; command?: { findAndModify?: string } }) =>
								operation.appName === application && operation.command?.findAndModify
						);
						if (inFlight) await delay(10);
					}
					assert.equal(inFlight, false);
					await AdminWorkflowLock.deleteOne({ _id: "authorization-workflow", owner: "synthetic-slow-owner" });
					await control.close();
				}
				assert.equal(await withAuthorizationWorkflowLock(async () => "recovered"), "recovered");
			}
		);
	}
);
