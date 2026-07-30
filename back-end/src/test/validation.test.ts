import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isValidEmail,
	normalizeEmail,
	parseAccountCreate,
	parseAccountUpdate,
	parseAdminPeerPrivilegeUpdate,
	parseAdminUpdate,
	parseStaffUserUpdate,
	parseTutorStatus
} from "../validation.js";

describe("account input validation", () => {
	it("normalizes valid signup input and rejects role or privilege mass assignment", () => {
		const input = parseAccountCreate({
			name: "  Jane Doe ",
			email: " JANE@EXAMPLE.COM ",
			password: "long-enough-password",
			age: "34",
			state: "Georgia"
		});
		assert.equal(input.name, "Jane Doe");
		assert.equal(input.email, "jane@example.com");
		assert.throws(
			() =>
				parseAccountCreate({
					...input,
					role: "admin"
				}),
			/unsupported fields/
		);
		assert.throws(
			() =>
				parseAccountCreate({
					...input,
					editAdmins: true
				}),
			/unsupported fields/
		);
	});

	it("enforces bounded credentials and profile fields", () => {
		assert.throws(() => parseAccountUpdate({ password: "replacement-password" }), /Current password/);
		assert.throws(() => parseAccountUpdate({ password: "too-short", currentPassword: "existing" }), /12-128/);
		assert.deepEqual(
			parseAccountUpdate({
				email: "new@example.com",
				currentPassword: "existing-password"
			}),
			{
				name: undefined,
				email: "new@example.com",
				password: undefined,
				currentPassword: "existing-password",
				age: undefined,
				state: undefined
			}
		);
		assert.throws(() => parseAccountUpdate({ currentPassword: "existing" }), /only with/);
		assert.throws(() => parseAccountUpdate({ age: "999" }), /0 to 130/);
		assert.throws(() => parseAccountUpdate({}), /At least one/);
		assert.equal(normalizeEmail(" A@Example.Com "), "a@example.com");
		assert.equal(isValidEmail("person@example.com"), true);
		assert.equal(isValidEmail(`${"x".repeat(245)}@example.com`), false);
	});

	it("allows privilege changes only in an admin-manager path", () => {
		assert.throws(() => parseAdminUpdate({ editAdmins: true }, false), /unsupported fields/);
		assert.deepEqual(parseAdminUpdate({ editAdmins: true }, true), { editAdmins: true });
		assert.throws(() => parseAdminUpdate({ role: "admin" }, true), /unsupported fields/);
		assert.deepEqual(parseAdminPeerPrivilegeUpdate({ editAdmins: false }), { editAdmins: false });
		assert.throws(() => parseAdminPeerPrivilegeUpdate({ email: "takeover@example.com" }), /unsupported fields/);
	});

	it("prevents tutors and staff from changing user credentials or assignments", () => {
		assert.deepEqual(parseStaffUserUpdate({ name: "New Name", state: "GA" }), {
			name: "New Name",
			age: undefined,
			state: "GA"
		});
		assert.throws(() => parseStaffUserUpdate({ email: "takeover@example.com" }), /unsupported fields/);
		assert.throws(() => parseStaffUserUpdate({ password: "replacement-password" }), /unsupported fields/);
		assert.throws(() => parseStaffUserUpdate({ tutor: "target" }), /unsupported fields/);
	});

	it("accepts only explicit tutor promotion and suspension states", () => {
		assert.equal(parseTutorStatus({ status: "active" }), "active");
		assert.equal(parseTutorStatus({ status: "suspended" }), "suspended");
		assert.throws(() => parseTutorStatus({ status: "pending" }), /active or suspended/);
	});
});
