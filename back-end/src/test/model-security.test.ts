import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Types } from "mongoose";
import { Admin } from "../models/schemas/Admin.js";
import { Tutor } from "../models/schemas/Tutor.js";
import { User } from "../models/schemas/User.js";

describe("account model security", () => {
	it("updates existing accounts without selecting password hashes", async () => {
		const accounts = [
			Admin.hydrate({
				_id: new Types.ObjectId(),
				name: "Admin",
				email: "admin@example.test",
				authVersion: 0,
				editAdmins: false,
				role: "admin"
			}),
			Tutor.hydrate({
				_id: new Types.ObjectId(),
				name: "Tutor",
				email: "tutor@example.test",
				age: "30",
				state: "Utah",
				authVersion: 0,
				status: "pending",
				role: "tutor"
			}),
			User.hydrate({
				_id: new Types.ObjectId(),
				name: "User",
				email: "user@example.test",
				age: "17",
				state: "Utah",
				authVersion: 0,
				role: "user"
			})
		];
		for (const account of accounts) {
			account.name = `${account.name} Updated`;
			await account.validate();
		}
	});

	it("rejects role changes and requires passwords for new accounts", async () => {
		const tutor = Tutor.hydrate({
			_id: new Types.ObjectId(),
			name: "Tutor",
			email: "tutor@example.test",
			age: "30",
			state: "Utah",
			authVersion: 0,
			status: "active",
			role: "tutor"
		});
		tutor.set("role", "admin");
		await assert.rejects(() => tutor.validate(), /roles are immutable/i);

		const missingPassword = new User({
			name: "User",
			email: "user@example.test",
			age: "17",
			state: "Utah"
		});
		await assert.rejects(() => missingPassword.validate(), /password.*required/i);
	});

	it("never serializes a password value", () => {
		const account = new Admin({
			name: "Admin",
			email: "admin@example.test",
			password: "not-a-real-password",
			editAdmins: true
		});
		assert.equal("password" in account.toJSON(), false);
	});
});
