import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import test from "node:test";
import mongoose from "mongoose";
import { HttpError } from "../errors.js";
import { AccountEmail } from "../models/schemas/AccountEmail.js";
import { User } from "../models/schemas/User.js";
import { createAccount } from "../services/accountService.js";
import { ensureIdentityRegistry, replaceIdentity, reserveIdentity } from "../services/identityRegistry.js";
import { accountWriteDefinitelyFailed } from "../services/identityWriteSafety.js";

const fixture = process.env.TEST_MONGODB_URI;
test(
	"ambiguous committed account writes retain cross-role login reservations",
	{ skip: !fixture, timeout: 30000 },
	async () => {
		assert.ok(fixture && /^mongodb:\/\/127\.0\.0\.1:\d+\/operation_security_test/.test(fixture));
		const uri = new URL(fixture);
		uri.pathname = `/operation_security_test_${randomUUID().replaceAll("-", "")}`;
		await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 1000, timeoutMS: 5000 });
		const originalSave = User.prototype.save;
		try {
			await User.init();
			await AccountEmail.init();
			// Model a successful account insert followed by a lost acknowledgment.
			User.prototype.save = async function (...args: Parameters<typeof originalSave>) {
				await originalSave.apply(this, args);
				throw new mongoose.mongo.MongoOperationTimeoutError("synthetic lost acknowledgment");
			};
			await assert.rejects(
				createAccount("user", {
					name: "Fixture",
					email: "retained@fixture.test",
					password: "Synthetic-password-123",
					age: "18",
					state: "Fixture"
				}),
				/lost acknowledgment/
			);
			User.prototype.save = originalSave;
			const account = await User.findOne({ email: "retained@fixture.test" });
			assert.ok(account);
			await assert.rejects(reserveIdentity(account.email, "tutor", new mongoose.Types.ObjectId()), {
				code: 11000
			});
			await assert.rejects(
				replaceIdentity(account.email, "renamed@fixture.test", "user", account._id, async () => {
					await User.collection.updateOne({ _id: account._id }, { $set: { email: "renamed@fixture.test" } });
					throw new mongoose.mongo.MongoNetworkError("synthetic lost acknowledgment");
				}),
				/lost acknowledgment/
			);
			await assert.rejects(reserveIdentity("renamed@fixture.test", "admin", new mongoose.Types.ObjectId()), {
				code: 11000
			});
			assert.equal(await AccountEmail.countDocuments({ accountId: account._id }), 2);
			await ensureIdentityRegistry();
			assert.equal(await AccountEmail.countDocuments({ accountId: account._id }), 1);
			assert.ok(await AccountEmail.findById("renamed@fixture.test"));
			await assert.rejects(
				replaceIdentity("renamed@fixture.test", "retry@fixture.test", "user", account._id, async () => {
					throw new HttpError(503, "authentication_busy", "fixture");
				})
			);
			assert.equal(await AccountEmail.findById("retry@fixture.test"), null);
			assert.equal(accountWriteDefinitelyFailed(new Error("unknown write outcome")), false);
			assert.equal(accountWriteDefinitelyFailed(new mongoose.Error.ValidationError()), true);
		} finally {
			User.prototype.save = originalSave;
			await mongoose.connection.dropDatabase();
			await mongoose.disconnect();
		}
	}
);
