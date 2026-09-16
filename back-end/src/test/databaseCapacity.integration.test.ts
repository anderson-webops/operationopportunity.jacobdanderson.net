import type { AppConfig } from "../config.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, request } from "node:http";
import process from "node:process";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import express from "express";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { DATABASE_OPTIONS } from "../databaseCapacity.js";
import { User } from "../models/schemas/User.js";
import { RequestCapacity, trackHandler } from "../runtimeCapacity.js";

const uri = process.env.MONGO_FAULT_TEST_URI;
test(
	"real Mongo probes share a deadline and cancelled model reads release their slots",
	{ skip: !uri, timeout: 45000 },
	async (context) => {
		context.after(async () => {
			if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
		});
		assert.ok(uri && /^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri));
		const database = `operation_security_test_${randomUUID().replaceAll("-", "")}`;
		const application = `operation-capacity-${randomUUID()}`;
		const target = new URL(uri);
		target.pathname = `/${database}`;
		await mongoose.connect(target.toString(), { ...DATABASE_OPTIONS, appName: application, monitorCommands: true });
		const control = new mongoose.mongo.MongoClient(uri, { timeoutMS: 10000, appName: "fixture-controller" });
		context.after(async () => {
			await control.close();
		});
		await control.connect();
		await User.createCollection();
		await User.init();
		await User.collection.insertOne({
			name: "Read fixture",
			email: "read@example.test",
			role: "user",
			authVersion: 0
		});
		const config: AppConfig = {
			environment: "test",
			isProduction: false,
			host: "127.0.0.1",
			port: 0,
			publicOrigin: "http://localhost:3333",
			trustedProxyIps: [],
			sessionSecrets: ["synthetic-capacity-session-".padEnd(48, "s")],
			sessionCookieName: "fixture.sid",
			sessionMaxAgeMs: 60000,
			sessionRememberMaxAgeMs: 120000,
			mongoUri: target.toString(),
			allowUnauthenticatedLoopbackMongo: true,
			enableInternalDiagnostics: false,
			quotesUpstreamUrl: new URL("http://127.0.0.1:9"),
			requestBodyLimit: "64kb"
		};
		const app = createApp(config);
		const probeServer = createServer(app);
		const capacity = new RequestCapacity(1);
		const reads = express();
		reads.use(capacity.middleware);
		reads.get(
			"/",
			trackHandler(async (_req, res) => {
				const user = await User.findOne({ email: "read@example.test" }).lean().exec();
				res.json(user);
			})
		);
		reads.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
			if (!res.destroyed) res.status(503).end();
		});
		const readServer = createServer(reads);
		const listen = async (server: ReturnType<typeof createServer>) => {
			await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
			const address = server.address();
			assert.ok(address && typeof address !== "string");
			return `http://127.0.0.1:${address.port}`;
		};
		const base = await listen(probeServer);
		const readBase = await listen(readServer);
		const fail = async (commands: string[], milliseconds: number) =>
			control.db("admin").command({
				configureFailPoint: "failCommand",
				mode: "alwaysOn",
				data: {
					appName: application,
					failCommands: commands,
					blockConnection: true,
					blockTimeMS: milliseconds
				}
			});
		const clear = async () => control.db("admin").command({ configureFailPoint: "failCommand", mode: "off" });
		let pingCommands = 0;
		mongoose.connection.getClient().on("commandStarted", (event) => {
			if (event.commandName === "ping") pingCommands++;
		});
		try {
			await fail(["ping"], 3000);
			const started = performance.now();
			const responses = await Promise.all(Array.from({ length: 10 }, () => fetch(`${base}/readyz`)));
			for (const response of responses) {
				assert.equal(response.status, 503);
				assert.deepEqual(await response.json(), { ok: false });
			}
			assert.equal(pingCommands, 1);
			assert.ok(performance.now() - started < 2500);
			const live = await fetch(`${base}/healthz`);
			assert.equal(live.status, 200);
			await live.arrayBuffer();
			await clear();
			const ready = await fetch(`${base}/readyz`);
			assert.equal(ready.status, 200);
			await ready.arrayBuffer();
			await fail(["find"], 8000);
			const client = request(readBase);
			client.on("error", () => {});
			client.end();
			try {
				let seen = false;
				for (let i = 0; i < 100; i++) {
					const operations = await control.db("admin").command({ currentOp: 1, active: true });
					if (
						operations.inprog.some(
							(op: { appName?: string; command?: { find?: string } }) =>
								op.appName === application && op.command?.find === "users"
						)
					) {
						seen = true;
						break;
					}
					await delay(10);
				}
				assert.equal(seen, true);
				assert.equal(capacity.activeRequests, 1);
				client.destroy();
				await delay(10);
				await Promise.race([
					capacity.drain(),
					delay(1500).then(() => {
						throw new Error("Cancelled read kept its admission slot");
					})
				]);
				assert.equal(capacity.activeRequests, 0);
			} finally {
				client.destroy();
			}
			await clear();
			const recovered = await fetch(readBase);
			assert.equal(recovered.status, 200);
			await recovered.arrayBuffer();
		} finally {
			await clear();
			for (const server of [probeServer, readServer]) {
				server.closeAllConnections();
				await new Promise<void>((resolve) => server.close(() => resolve()));
			}
			await mongoose.connection.dropDatabase();
			await mongoose.disconnect();
			await control.close();
		}
	}
);
