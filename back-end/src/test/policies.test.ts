import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	adminRemovalBlockReason,
	canAssignTutor,
	canMutateAdmin,
	canStaffUpdateUser,
	canUserMutateSelf
} from "../security/policies.js";

describe("authorization policies", () => {
	it("limits ordinary admins to themselves and permits managers to manage peers", () => {
		assert.equal(canMutateAdmin("a1", false, "a1"), true);
		assert.equal(canMutateAdmin("a1", false, "a2"), false);
		assert.equal(canMutateAdmin("a1", true, "a2"), true);
	});

	it("preserves the last admin and last admin manager", () => {
		assert.equal(adminRemovalBlockReason(1, 1, true), "last_admin");
		assert.equal(adminRemovalBlockReason(2, 1, true), "last_admin_manager");
		assert.equal(adminRemovalBlockReason(2, 1, false), null);
		assert.equal(adminRemovalBlockReason(3, 2, true), null);
	});

	it("prevents cross-account user mutation and cross-tutor access", () => {
		assert.equal(canUserMutateSelf("user", "u1", "u1"), true);
		assert.equal(canUserMutateSelf("user", "u1", "u2"), false);
		assert.equal(canUserMutateSelf("tutor", "u1", "u1"), false);
		assert.equal(canStaffUpdateUser("tutor", "t1", "t1"), true);
		assert.equal(canStaffUpdateUser("tutor", "t1", "t2"), false);
		assert.equal(canStaffUpdateUser("admin", "a1", null), true);
	});

	it("allows tutor assignment only by that user or an admin", () => {
		assert.equal(canAssignTutor("user", "u1", "u1"), true);
		assert.equal(canAssignTutor("user", "u1", "u2"), false);
		assert.equal(canAssignTutor("tutor", "t1", "u1"), false);
		assert.equal(canAssignTutor("admin", "a1", "u1"), true);
	});
});
