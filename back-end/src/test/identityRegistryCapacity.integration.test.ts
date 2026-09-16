import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import mongoose from "mongoose";
import { DATABASE_OPTIONS } from "../databaseCapacity.js";
import { AccountEmail } from "../models/schemas/AccountEmail.js";
import { Admin } from "../models/schemas/Admin.js";
import { Tutor } from "../models/schemas/Tutor.js";
import { User } from "../models/schemas/User.js";
import { createIdentityIndex } from "../services/identityIndex.js";
import { ensureIdentityRegistry } from "../services/identityRegistry.js";
import { normalizeEmail } from "../validation.js";

const fixture = process.env.TEST_MONGODB_URI;
test(
	"complete startup identity reconciliation has bounded reads and private disposable state",
	{ skip: !fixture, timeout: 30000 },
	async (context) => {
		assert.ok(fixture && /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test/.test(fixture));
		const target = new URL(fixture);
		target.pathname = `/operation_security_test_${randomUUID().replaceAll("-", "")}`;
		const temporary = await mkdtemp(join(tmpdir(), "identity-suite-"));
		const oldTmp = process.env.TMPDIR;
		process.env.TMPDIR = temporary;
		const application = `identity-fixture-${randomUUID()}`;
		const control = new mongoose.mongo.MongoClient(fixture, { timeoutMS: 10000 });
		context.after(async () => {
			if (mongoose.connection.readyState !== 0) {
				await mongoose.connection.dropDatabase();
				await mongoose.disconnect();
			}
			await control.close();
			if (oldTmp === undefined) delete process.env.TMPDIR;
			else process.env.TMPDIR = oldTmp;
			await rm(temporary, { recursive: true, force: true });
		});
		await mongoose.connect(target.toString(), { ...DATABASE_OPTIONS, monitorCommands: true, appName: application });
		await control.connect();
		await Promise.all([Admin.init(), Tutor.init(), User.init(), AccountEmail.init()]);
		const events: Array<{ commandName: string; command: Record<string, any> }> = [];
		const capture = (event: { commandName: string; command: Record<string, any> }) => events.push(event);
		const assertClean = async () => assert.deepEqual(await readdir(temporary), []);
		await context.test("private index preserves exact Unicode identity equality", async () => {
			const index = await createIdentityIndex();
			try {
				const [folder] = await readdir(temporary);
				assert.ok(folder);
				assert.equal((await stat(join(temporary, folder))).mode & 0o077, 0);
				assert.equal((await stat(join(temporary, folder, "index.sqlite"))).mode & 0o777, 0o600);
				for (const email of ["İNFO@EXAMPLE.TEST", "INFO@EXAMPLE.TEST", "Straße@example.test"]) {
					index.add({
						email: normalizeEmail(email),
						role: "user",
						accountId: new mongoose.Types.ObjectId().toString(),
						previousEmail: email
					});
				}
				assert.notEqual(index.get("i̇nfo@example.test")?.accountId, index.get("info@example.test")?.accountId);
				assert.throws(
					() =>
						index.add({
							email: normalizeEmail("  STRAẞE@example.test\u00A0"),
							role: "admin",
							accountId: new mongoose.Types.ObjectId().toString(),
							previousEmail: "fixture"
						}),
					/Duplicate normalized/
				);
			} finally {
				await index.dispose();
			}
			await assertClean();
		});
		await context.test("all roles and rows reconcile, while unchanged startup writes nothing", async () => {
			const expected: Array<{ _id: string; role: string; accountId: mongoose.Types.ObjectId }> = [];
			for (const [role, model] of [
				["admin", Admin],
				["tutor", Tutor],
				["user", User]
			] as const) {
				const rows = Array.from({ length: 260 }, (_, i) => {
					const _id = new mongoose.Types.ObjectId();
					const email = ` ${role}-${String(i).padStart(4, "0")}@FIXTURE.TEST `;
					expected.push({ _id: normalizeEmail(email), role, accountId: _id });
					return { _id, name: "Fixture", email, role };
				});
				await model.collection.insertMany(rows);
			}
			await AccountEmail.insertMany(expected.slice(0, 300));
			await AccountEmail.create({
				_id: "stale@fixture.test",
				role: "user",
				accountId: new mongoose.Types.ObjectId()
			});
			mongoose.connection.getClient().on("commandStarted", capture);
			try {
				await ensureIdentityRegistry();
			} finally {
				mongoose.connection.getClient().off("commandStarted", capture);
			}
			assert.equal(await AccountEmail.countDocuments(), expected.length);
			for (const [role, model] of [
				["admin", Admin],
				["tutor", Tutor],
				["user", User]
			] as const) {
				const rows = await model.collection.find({}, { projection: { email: 1 } }).toArray();
				assert.equal(rows.length, 260);
				for (const row of rows) assert.equal(row.email, normalizeEmail(row.email));
				assert.equal(await AccountEmail.countDocuments({ role }), 260);
			}
			for (const identity of expected) {
				const actual = await AccountEmail.findById(identity._id).lean();
				assert.equal(actual?.role, identity.role);
				assert.equal(actual?.accountId.toString(), identity.accountId.toString());
			}
			assert.ok(events.some((e) => e.commandName === "getMore"));
			for (const event of events.filter((e) => e.commandName === "find" && e.command.batchSize !== undefined))
				assert.equal(event.command.batchSize, 128);
			await assertClean();
			events.length = 0;
			mongoose.connection.getClient().on("commandStarted", capture);
			try {
				await ensureIdentityRegistry();
			} finally {
				mongoose.connection.getClient().off("commandStarted", capture);
			}
			assert.equal(events.filter((e) => ["insert", "update", "delete"].includes(e.commandName)).length, 0);
			await assertClean();
		});
		await context.test("late cross-role duplicates, including shared object IDs, fail before repairs", async () => {
			const original = await User.findOne({ email: "user-0000@fixture.test" }).lean();
			assert.ok(original);
			const duplicate = {
				_id: original._id,
				name: "Duplicate",
				email: " USER-0000@FIXTURE.TEST ",
				role: "admin"
			};
			await Admin.collection.insertOne(duplicate);
			const before = await AccountEmail.find().sort({ _id: 1 }).lean();
			await assert.rejects(ensureIdentityRegistry(), /Duplicate normalized/);
			assert.deepEqual(await AccountEmail.find().sort({ _id: 1 }).lean(), before);
			assert.equal((await Admin.collection.findOne({ _id: duplicate._id }))?.email, duplicate.email);
			await Admin.collection.deleteOne({ _id: duplicate._id });
			await assertClean();
		});
		await context.test("unavailable scratch fails closed before database mutation", async () => {
			const file = join(temporary, "not-a-directory");
			await writeFile(file, "fixture");
			process.env.TMPDIR = file;
			events.length = 0;
			mongoose.connection.getClient().on("commandStarted", capture);
			try {
				await assert.rejects(ensureIdentityRegistry());
			} finally {
				process.env.TMPDIR = temporary;
				mongoose.connection.getClient().off("commandStarted", capture);
				await rm(file);
			}
			assert.equal(events.length, 0);
			await assertClean();
		});
		if (process.env.MONGO_FAULT_TEST_URI) {
			await context.test("aborted startup releases its query and disk index, then recovers", async () => {
				const abort = new AbortController();
				await control.db("admin").command({
					configureFailPoint: "failCommand",
					mode: "alwaysOn",
					data: { appName: application, failCommands: ["find"], blockConnection: true, blockTimeMS: 2500 }
				});
				const seen = new Promise<void>((resolve) => {
					const listener = (event: { commandName: string }) => {
						if (event.commandName === "find") {
							mongoose.connection.getClient().off("commandStarted", listener);
							resolve();
						}
					};
					mongoose.connection.getClient().on("commandStarted", listener);
				});
				const pending = ensureIdentityRegistry(abort.signal);
				const rejected = assert.rejects(pending);
				try {
					await seen;
					const started = performance.now();
					abort.abort(new Error("fixture cancellation"));
					await rejected;
					assert.ok(performance.now() - started < 1500);
					await assertClean();
				} finally {
					await control.db("admin").command({ configureFailPoint: "failCommand", mode: "off" });
				}
				await delay(10);
				await ensureIdentityRegistry();
				await assertClean();
			});
		}
	}
);
