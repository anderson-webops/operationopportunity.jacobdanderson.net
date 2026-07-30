import type { Types } from "mongoose";
import type { AccountDocument, AccountRole } from "../types/account.js";
import type { AccountCreateInput, AccountUpdateInput, AdminCreateInput, AdminUpdateInput } from "../validation.js";
import { HttpError, isDuplicateKeyError } from "../errors.js";
import { Admin } from "../models/schemas/Admin.js";
import { Tutor } from "../models/schemas/Tutor.js";
import { User } from "../models/schemas/User.js";
import { releaseIdentity, replaceIdentity, reserveIdentity } from "./identityRegistry.js";

type CreateInput = AccountCreateInput | AdminCreateInput;
type UpdateInput = AccountUpdateInput | AdminUpdateInput;

async function verifyCurrentPassword(
	account: AccountDocument,
	role: AccountRole,
	currentPassword: string | undefined
): Promise<void> {
	const candidate =
		role === "admin"
			? await Admin.findById(account._id).select("+password").exec()
			: role === "tutor"
				? await Tutor.findById(account._id).select("+password").exec()
				: await User.findById(account._id).select("+password").exec();
	if (!candidate || !currentPassword || !(await candidate.comparePassword(currentPassword))) {
		throw new HttpError(403, "invalid_current_password", "Current password is incorrect.");
	}
}

function instantiate(role: AccountRole, input: CreateInput): AccountDocument {
	const base = {
		name: input.name,
		email: input.email,
		password: input.password,
		...(role !== "admin" ? { age: input.age, state: input.state } : {})
	};
	if (role === "admin") {
		return new Admin({ ...base, role, editAdmins: (input as AdminCreateInput).editAdmins });
	}
	if (role === "tutor") return new Tutor({ ...base, role });
	return new User({ ...base, role });
}

export async function createAccount(role: AccountRole, input: CreateInput): Promise<AccountDocument> {
	const account = instantiate(role, input);
	await reserveIdentity(input.email, role, account._id);
	try {
		await account.save();
		return account;
	} catch (error) {
		await releaseIdentity(input.email, account._id);
		if (isDuplicateKeyError(error)) {
			throw new HttpError(409, "email_conflict", "That email address is already in use.");
		}
		throw error;
	}
}

export async function updateAccount(
	account: AccountDocument,
	role: AccountRole,
	input: UpdateInput,
	options: { operatorPasswordReset?: boolean } = {}
): Promise<AccountDocument> {
	const changesCredentials = input.email !== undefined || input.password !== undefined;
	if (changesCredentials && !options.operatorPasswordReset) {
		await verifyCurrentPassword(account, role, input.currentPassword);
	}
	const previousEmail = account.email;
	let securityIdentityChanged = false;

	if (input.name !== undefined) account.name = input.name;
	if ("age" in account && input.age !== undefined) account.age = input.age;
	if ("state" in account && input.state !== undefined) account.state = input.state;
	if (input.password !== undefined) {
		account.password = input.password;
		securityIdentityChanged = true;
	}
	if (role === "admin" && "editAdmins" in input && input.editAdmins !== undefined) {
		(account as InstanceType<typeof Admin>).editAdmins = input.editAdmins;
	}
	if (input.email !== undefined && input.email !== previousEmail) {
		account.email = input.email;
		securityIdentityChanged = true;
	}
	if (securityIdentityChanged) account.authVersion += 1;

	const save = async () => {
		try {
			await account.save();
		} catch (error) {
			if (isDuplicateKeyError(error)) {
				throw new HttpError(409, "email_conflict", "That email address is already in use.");
			}
			throw error;
		}
	};

	if (input.email !== undefined && input.email !== previousEmail) {
		await replaceIdentity(previousEmail, input.email, role, account._id, save);
	} else {
		await save();
	}
	return account;
}

export async function deleteAccount(account: AccountDocument): Promise<void> {
	const id = account._id as Types.ObjectId;
	const email = account.email;
	await account.deleteOne();
	await releaseIdentity(email, id);
}

export function serializeAccount(account: AccountDocument): Record<string, unknown> {
	const result = account.toJSON();
	delete result.authVersion;
	return result;
}

export function serializeTutorDirectory(account: InstanceType<typeof Tutor>): Record<string, unknown> {
	return {
		_id: account._id,
		name: account.name,
		state: account.state || null
	};
}
