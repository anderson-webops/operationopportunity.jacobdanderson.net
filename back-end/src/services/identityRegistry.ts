import type { Model, Types } from "mongoose";
import type { AccountRole } from "../types/account.js";
import { AccountEmail } from "../models/schemas/AccountEmail.js";
import { Admin } from "../models/schemas/Admin.js";
import { Tutor } from "../models/schemas/Tutor.js";
import { User } from "../models/schemas/User.js";
import { normalizeEmail } from "../validation.js";

interface ExistingIdentity {
	_id: Types.ObjectId;
	email: string;
}

interface RegistryIdentity {
	_id: string;
	role: AccountRole;
	accountId: Types.ObjectId;
}

interface IdentitySource {
	role: AccountRole;
	model: Model<any>;
}

const SOURCES: IdentitySource[] = [
	{ role: "admin", model: Admin },
	{ role: "tutor", model: Tutor },
	{ role: "user", model: User }
];

export async function ensureIdentityRegistry(): Promise<void> {
	const expected = new Map<string, { role: AccountRole; accountId: Types.ObjectId }>();
	const normalizations: Array<{
		source: IdentitySource;
		accountId: Types.ObjectId;
		previousEmail: string;
		email: string;
	}> = [];

	for (const source of SOURCES) {
		const accounts = await source.model
			.find({}, { _id: 1, email: 1 })
			.lean<ExistingIdentity[]>()
			.exec();
		for (const account of accounts) {
			const email = normalizeEmail(account.email);
			const conflict = expected.get(email);
			if (conflict && !conflict.accountId.equals(account._id)) {
				throw new Error("Duplicate normalized login identity detected during startup");
			}
			expected.set(email, { role: source.role, accountId: account._id });
			if (account.email !== email) {
				normalizations.push({
					source,
					accountId: account._id,
					previousEmail: account.email,
					email
				});
			}
		}
	}

	for (const normalization of normalizations) {
		try {
			const result = await normalization.source.model.collection.updateOne(
				{
					_id: normalization.accountId,
					email: normalization.previousEmail
				},
				{ $set: { email: normalization.email } }
			);
			if (result.matchedCount !== 1) {
				throw new Error("Login identity changed during startup");
			}
		}
		catch {
			throw new Error("Login identity normalization failed during startup");
		}
	}

	const storedIdentities = await AccountEmail
		.find({}, { _id: 1, role: 1, accountId: 1 })
		.lean<RegistryIdentity[]>()
		.exec();
	for (const stored of storedIdentities) {
		const authoritative = expected.get(stored._id);
		if (!authoritative
			|| authoritative.role !== stored.role
			|| !authoritative.accountId.equals(stored.accountId)) {
			await AccountEmail.deleteOne({
				_id: stored._id,
				role: stored.role,
				accountId: stored.accountId
			});
		}
	}

	for (const [email, identity] of expected) {
		await AccountEmail.updateOne(
			{ _id: email },
			{ $set: identity },
			{ upsert: true }
		);
		const stored = await AccountEmail.findById(email).lean().exec();
		if (!stored || stored.role !== identity.role || !stored.accountId.equals(identity.accountId)) {
			throw new Error("Login identity registry mismatch detected during startup");
		}
	}
}

export async function reserveIdentity(
	email: string,
	role: AccountRole,
	accountId: Types.ObjectId
): Promise<void> {
	await AccountEmail.create({ _id: normalizeEmail(email), role, accountId });
}

export async function releaseIdentity(email: string, accountId: Types.ObjectId): Promise<void> {
	await AccountEmail.deleteOne({ _id: normalizeEmail(email), accountId });
}

export async function replaceIdentity(
	oldEmail: string,
	newEmail: string,
	role: AccountRole,
	accountId: Types.ObjectId,
	updateAccount: () => Promise<void>
): Promise<void> {
	const normalizedOld = normalizeEmail(oldEmail);
	const normalizedNew = normalizeEmail(newEmail);
	if (normalizedOld === normalizedNew) {
		await updateAccount();
		return;
	}

	await reserveIdentity(normalizedNew, role, accountId);
	try {
		await updateAccount();
	}
	catch (error) {
		await releaseIdentity(normalizedNew, accountId);
		throw error;
	}
	await releaseIdentity(normalizedOld, accountId);
}
