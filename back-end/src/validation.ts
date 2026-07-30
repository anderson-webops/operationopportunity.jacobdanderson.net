import { HttpError } from "./errors.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]{2,}$/;

export interface AccountCreateInput {
	name: string;
	email: string;
	password: string;
	age?: string;
	state?: string;
}

export interface AccountUpdateInput {
	name?: string;
	email?: string;
	password?: string;
	currentPassword?: string;
	age?: string;
	state?: string;
}

export interface AdminCreateInput extends AccountCreateInput {
	editAdmins: boolean;
}

export interface AdminUpdateInput extends AccountUpdateInput {
	editAdmins?: boolean;
}

export interface StaffUserUpdateInput {
	name?: string;
	age?: string;
	state?: string;
}

function asObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new HttpError(400, "invalid_request", "A JSON object is required.");
	}
	return value as Record<string, unknown>;
}

function rejectUnknown(input: Record<string, unknown>, allowed: Set<string>) {
	const unknown = Object.keys(input).filter(key => !allowed.has(key));
	if (unknown.length) {
		throw new HttpError(400, "unsupported_fields", "The request contains unsupported fields.");
	}
}

function requiredString(input: Record<string, unknown>, key: string, min: number, max: number): string {
	const value = input[key];
	if (typeof value !== "string") throw new HttpError(400, "invalid_input", `${key} is required.`);
	const normalized = value.trim();
	if (normalized.length < min || normalized.length > max) {
		throw new HttpError(400, "invalid_input", `${key} must be ${min}-${max} characters.`);
	}
	return normalized;
}

function optionalString(input: Record<string, unknown>, key: string, min: number, max: number): string | undefined {
	if (!(key in input)) return undefined;
	return requiredString(input, key, min, max);
}

export function normalizeEmail(value: string): string {
	return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
	return value.length >= 3
		&& value.length <= 254
		&& EMAIL_PATTERN.test(value);
}

function email(input: Record<string, unknown>, required: boolean): string | undefined {
	if (!required && !("email" in input)) return undefined;
	const value = requiredString(input, "email", 3, 254);
	const normalized = normalizeEmail(value);
	if (!isValidEmail(normalized)) {
		throw new HttpError(400, "invalid_email", "A valid email address is required.");
	}
	return normalized;
}

function password(input: Record<string, unknown>, required: boolean): string | undefined {
	if (!required && !("password" in input)) return undefined;
	const value = input.password;
	if (typeof value !== "string" || value.length < 12 || value.length > 128) {
		throw new HttpError(400, "invalid_password", "Password must be 12-128 characters.");
	}
	return value;
}

function age(input: Record<string, unknown>): string | undefined {
	const value = optionalString(input, "age", 1, 3);
	if (value !== undefined && (!/^\d{1,3}$/.test(value) || Number(value) > 130)) {
		throw new HttpError(400, "invalid_age", "Age must be a number from 0 to 130.");
	}
	return value;
}

function state(input: Record<string, unknown>): string | undefined {
	return optionalString(input, "state", 2, 100);
}

const ACCOUNT_CREATE_FIELDS = new Set(["name", "email", "password", "age", "state"]);
const ACCOUNT_UPDATE_FIELDS = new Set([
	"name",
	"email",
	"password",
	"currentPassword",
	"age",
	"state"
]);

export function parseAccountCreate(value: unknown): AccountCreateInput {
	const input = asObject(value);
	rejectUnknown(input, ACCOUNT_CREATE_FIELDS);
	return {
		name: requiredString(input, "name", 1, 100),
		email: email(input, true)!,
		password: password(input, true)!,
		age: age(input),
		state: state(input)
	};
}

export function parseAccountUpdate(value: unknown): AccountUpdateInput {
	const input = asObject(value);
	rejectUnknown(input, ACCOUNT_UPDATE_FIELDS);
	const changesCredentials = "email" in input || "password" in input;
	const currentPassword = input.currentPassword;
	if (changesCredentials
		&& (typeof currentPassword !== "string"
			|| currentPassword.length < 1
			|| currentPassword.length > 128)) {
		throw new HttpError(
			400,
			"current_password_required",
			"Current password is required for email or password changes."
		);
	}
	if (!changesCredentials && "currentPassword" in input) {
		throw new HttpError(
			400,
			"unsupported_fields",
			"Current password is accepted only with an email or password change."
		);
	}
	const result: AccountUpdateInput = {
		name: optionalString(input, "name", 1, 100),
		email: email(input, false),
		password: password(input, false),
		currentPassword: changesCredentials ? currentPassword as string : undefined,
		age: age(input),
		state: state(input)
	};
	if (!Object.values(result).some(value => value !== undefined)) {
		throw new HttpError(400, "empty_update", "At least one supported field is required.");
	}
	return result;
}

export function parseOperatorPasswordReset(value: unknown): Pick<AccountUpdateInput, "password"> {
	const input = asObject(value);
	rejectUnknown(input, new Set(["password"]));
	return { password: password(input, true)! };
}

export function parseAdminCreate(value: unknown): AdminCreateInput {
	const input = asObject(value);
	rejectUnknown(input, new Set([...ACCOUNT_CREATE_FIELDS, "editAdmins"]));
	const base = parseAccountCreate(Object.fromEntries(
		Object.entries(input).filter(([key]) => ACCOUNT_CREATE_FIELDS.has(key))
	));
	if ("editAdmins" in input && typeof input.editAdmins !== "boolean") {
		throw new HttpError(400, "invalid_input", "editAdmins must be a boolean.");
	}
	return { ...base, editAdmins: input.editAdmins === true };
}

export function parseAdminUpdate(value: unknown, allowPrivilegeChange: boolean): AdminUpdateInput {
	const input = asObject(value);
	const allowed = new Set([...ACCOUNT_UPDATE_FIELDS]);
	if (allowPrivilegeChange) allowed.add("editAdmins");
	rejectUnknown(input, allowed);
	const baseEntries = Object.entries(input).filter(([key]) => ACCOUNT_UPDATE_FIELDS.has(key));
	const base = baseEntries.length ? parseAccountUpdate(Object.fromEntries(baseEntries)) : {};
	if ("editAdmins" in input && typeof input.editAdmins !== "boolean") {
		throw new HttpError(400, "invalid_input", "editAdmins must be a boolean.");
	}
	const result = {
		...base,
		...(allowPrivilegeChange && "editAdmins" in input ? { editAdmins: input.editAdmins as boolean } : {})
	};
	if (!Object.keys(result).length) {
		throw new HttpError(400, "empty_update", "At least one supported field is required.");
	}
	return result;
}

export function parseAdminPeerPrivilegeUpdate(value: unknown): AdminUpdateInput {
	const input = asObject(value);
	rejectUnknown(input, new Set(["editAdmins"]));
	if (typeof input.editAdmins !== "boolean") {
		throw new HttpError(400, "invalid_input", "editAdmins must be a boolean.");
	}
	return { editAdmins: input.editAdmins };
}

export function parseStaffUserUpdate(value: unknown): StaffUserUpdateInput {
	const input = asObject(value);
	const allowed = new Set(["name", "age", "state"]);
	rejectUnknown(input, allowed);
	const result: StaffUserUpdateInput = {
		name: optionalString(input, "name", 1, 100),
		age: age(input),
		state: state(input)
	};
	if (!Object.values(result).some(value => value !== undefined)) {
		throw new HttpError(400, "empty_update", "At least one supported field is required.");
	}
	return result;
}

export function parseTutorStatus(value: unknown): "active" | "suspended" {
	const input = asObject(value);
	rejectUnknown(input, new Set(["status"]));
	if (input.status !== "active" && input.status !== "suspended") {
		throw new HttpError(400, "invalid_status", "Tutor status must be active or suspended.");
	}
	return input.status;
}
