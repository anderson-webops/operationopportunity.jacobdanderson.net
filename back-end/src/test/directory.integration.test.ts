import type { Response as TestResponse } from "supertest";
import type { AppConfig } from "../config.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { DATABASE_OPTIONS } from "../databaseCapacity.js";
import { Admin } from "../models/schemas/Admin.js";
import { Tutor } from "../models/schemas/Tutor.js";
import { User } from "../models/schemas/User.js";
import { createAccount } from "../services/accountService.js";

const fixture = process.env.TEST_MONGODB_URI;
test(
	"complete bounded directories preserve authorization and legacy arrays",
	{ skip: !fixture, timeout: 60000 },
	async (context) => {
		assert.ok(fixture && /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test/.test(fixture));
		const uri = new URL(fixture);
		uri.pathname = `/operation_security_test_${randomUUID().replaceAll("-", "")}`;
		await mongoose.connect(uri.toString(), DATABASE_OPTIONS);
		context.after(async () => {
			await mongoose.connection.dropDatabase();
			await mongoose.disconnect();
		});
		await Promise.all([Admin.init(), Tutor.init(), User.init()]);
		const actor = await createAccount("admin", {
			name: "Manager",
			email: "manager@fixture.test",
			password: "Synthetic-directory-123",
			editAdmins: true
		});
		const tutor = await createAccount("tutor", {
			name: "Own Tutor",
			email: "tutor@fixture.test",
			password: "Synthetic-directory-123",
			age: "30",
			state: "GA"
		});
		await Tutor.updateOne({ _id: tutor._id }, { $set: { status: "active" } });
		const otherTutor = new mongoose.Types.ObjectId();
		for (const [role, model] of [
			["admin", Admin],
			["tutor", Tutor],
			["user", User]
		] as const) {
			await model.collection.insertMany(
				Array.from({ length: 157 }, (_, index) => ({
					_id: new mongoose.Types.ObjectId(),
					name:
						index === 156
							? "Literal .* search"
							: `Repeated ${String(Math.floor(index / 5)).padStart(3, "0")}`,
					email: `${role}-${index}@fixture.test`,
					age: "20",
					state: "GA",
					role,
					password: "private-password-sentinel",
					authVersion: 0,
					createdAt: new Date(1000 + index),
					...(role === "tutor" ? { status: index % 3 ? "active" : "pending" } : {}),
					...(role === "user" ? { tutor: index % 2 ? otherTutor : tutor._id } : {}),
					...(role === "admin" ? { editAdmins: false } : {})
				}))
			);
		}
		const config: AppConfig = {
			environment: "test",
			isProduction: false,
			host: "127.0.0.1",
			port: 0,
			publicOrigin: "http://localhost:3333",
			trustedProxyIps: [],
			sessionSecrets: ["synthetic-directory-session-key-01234567890123456789"],
			sessionCookieName: "fixture.sid",
			sessionMaxAgeMs: 60000,
			sessionRememberMaxAgeMs: 120000,
			mongoUri: uri.toString(),
			allowUnauthenticatedLoopbackMongo: true,
			enableInternalDiagnostics: false,
			quotesUpstreamUrl: new URL("http://127.0.0.1:9"),
			requestBodyLimit: "64kb"
		};
		const app = createApp(config);
		async function login(email: string) {
			const agent = request.agent(app);
			const csrf = await agent.get("/accounts/csrf").expect(200);
			await agent
				.post("/accounts/login")
				.set("Origin", config.publicOrigin)
				.set("X-CSRF-Token", csrf.body.csrfToken)
				.send({ email, password: "Synthetic-directory-123" })
				.expect(200);
			return agent;
		}
		const manager = await login(actor.email);
		const assignedTutor = await login(tutor.email);
		await context.test(
			"normal role and assigned-user pages use sorting indexes without materialized sorts",
			async () => {
				for (const [model, filter] of [
					[Admin, {}],
					[Tutor, {}],
					[User, {}],
					[User, { tutor: tutor._id }]
				] as const) {
					const plan = await model.collection
						.find(filter)
						.sort({ name: 1, _id: 1 })
						.limit(51)
						.explain("executionStats");
					const winning = JSON.stringify(plan.queryPlanner.winningPlan);
					assert.match(winning, /IXSCAN/);
					assert.doesNotMatch(winning, /COLLSCAN|"stage":"SORT"/);
					assert.ok(plan.executionStats.totalDocsExamined <= 51);
				}
			}
		);
		await context.test(
			"traverses every row in each role, including equal names, without exposing private fields",
			async () => {
				for (const [path, model] of [
					["/admins", Admin],
					["/tutors/all", Tutor],
					["/users/all", User]
				] as const) {
					const expected = (await model.collection.find({}, { projection: { _id: 1 } }).toArray())
						.map((row) => row._id.toString())
						.sort();
					let next: string | null = null;
					const ids: string[] = [];
					do {
						const response: TestResponse = await manager
							.get(path)
							.query({ pageSize: 20, ...(next ? { after: next } : {}) })
							.expect(200);
						assert.equal(response.headers["cache-control"], "no-store");
						assert.ok(response.body.items.length <= 20);
						assert.doesNotMatch(response.text, /password|authVersion|private-password-sentinel/);
						ids.push(...response.body.items.map((row: { _id: string }) => row._id));
						next = response.body.next;
						assert.ok(ids.length <= expected.length);
					} while (next);
					assert.deepEqual(ids.sort(), expected);
					const legacy = await manager.get(path).expect(200);
					assert.ok(Array.isArray(legacy.body));
					assert.deepEqual(legacy.body.map((row: { _id: string }) => row._id).sort(), expected);
				}
			}
		);
		await context.test(
			"backwards traversal, literal search and selected-record lookup retain their scope",
			async () => {
				const first = await manager.get("/users/all").query({ pageSize: 20 }).expect(200);
				const second = await manager
					.get("/users/all")
					.query({ pageSize: 20, after: first.body.next })
					.expect(200);
				const back = await manager
					.get("/users/all")
					.query({ pageSize: 20, before: second.body.previous })
					.expect(200);
				assert.deepEqual(back.body.items, first.body.items);
				const search = await manager.get("/users/all").query({ pageSize: 20, q: ".*" }).expect(200);
				assert.equal(search.body.items.length, 1);
				assert.equal(search.body.items[0].name, "Literal .* search");
				const selected = await request(app)
					.get("/tutors")
					.query({ pageSize: 1, id: tutor._id.toString() })
					.expect(200);
				assert.deepEqual(Object.keys(selected.body.items[0]).sort(), ["_id", "name", "state"]);
				assert.equal(selected.body.items[0]._id, tutor._id.toString());
				const pending = await Tutor.findOne({ status: "pending" });
				assert.ok(pending);
				const hidden = await request(app)
					.get("/tutors")
					.query({ pageSize: 1, id: pending._id.toString() })
					.expect(200);
				assert.deepEqual(hidden.body.items, []);
			}
		);
		await context.test("malformed limits, operator queries and cursors fail closed", async () => {
			for (const query of [
				{ pageSize: 0 },
				{ pageSize: 51 },
				{ pageSize: "1.0" },
				{ pageSize: 20, after: "invalid" },
				{ pageSize: 20, after: "x", before: "y" },
				{ pageSize: 20, q: "x".repeat(81) },
				{ pageSize: 20, $where: "fixture" },
				{ q: "without-page-mode" }
			]) {
				await manager.get("/users/all").query(query).expect(400);
			}
		});
		await context.test("unauthenticated and cross-tutor reads are denied; demotion remains effective", async () => {
			await request(app).get("/users/all?pageSize=20").expect(401);
			await assignedTutor.get("/admins?pageSize=20").expect(403);
			await assignedTutor.get(`/users/oftutor/${otherTutor}?pageSize=20`).expect(403);
			const own = await assignedTutor.get(`/users/oftutor/${tutor._id}?pageSize=50`).expect(200);
			assert.equal(own.body.items.length, 50);
			assert.ok(own.body.next);
			for (const row of own.body.items) assert.equal(row.tutor, tutor._id.toString());
			await Tutor.updateOne({ _id: tutor._id }, { $set: { status: "suspended" } });
			await assignedTutor.get(`/users/oftutor/${tutor._id}?pageSize=50`).expect(403);
		});
	}
);
