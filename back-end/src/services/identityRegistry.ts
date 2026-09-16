import type { Model, Types } from "mongoose";
import type { AccountRole } from "../types/account.js";
import { setImmediate } from "node:timers/promises";
import mongoose from "mongoose";
import { AccountEmail } from "../models/schemas/AccountEmail.js";
import { Admin } from "../models/schemas/Admin.js";
import { Tutor } from "../models/schemas/Tutor.js";
import { User } from "../models/schemas/User.js";
import { normalizeEmail } from "../validation.js";
import { createIdentityIndex } from "./identityIndex.js";
import { accountWriteDefinitelyFailed } from "./identityWriteSafety.js";

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

/** Validate the full account set before repairing, with bounded cursor batches. */
export async function ensureIdentityRegistry(signal?: AbortSignal): Promise<void> {
	signal?.throwIfAborted();
	const index = await createIdentityIndex();
	let processed = 0;
	async function checkpoint() {
		signal?.throwIfAborted();
		if (++processed % 128 === 0) {
			await setImmediate();
			signal?.throwIfAborted();
		}
	}
	try {
		for (const source of SOURCES) {
			const cursor = source.model
				.find({}, { _id: 1, email: 1 })
				.sort({ _id: 1 })
				.setOptions({ signal, timeoutMS: 5000, timeoutMode: "iteration" })
				.lean<ExistingIdentity[]>()
				.cursor({ batchSize: 128 });
			try {
				for await (const account of cursor) {
					await checkpoint();
					// Keep JavaScript Unicode trim/lowercase behavior, not MongoDB $toLower.
					index.add({
						email: normalizeEmail(account.email),
						role: source.role,
						accountId: account._id.toString(),
						previousEmail: account.email
					});
				}
			} finally {
				await cursor.close();
			}
		}
		// Duplicate detection is complete before any authoritative account changes.
		for (const item of index.normalizations()) {
			await checkpoint();
			const source = SOURCES.find((source) => source.role === item.role)!;
			const result = await source.model.collection.updateOne(
				{ _id: new mongoose.Types.ObjectId(item.accountId), email: item.previousEmail },
				{ $set: { email: item.email } }
			);
			if (result.matchedCount !== 1) throw new Error("Login identity changed during startup");
		}
		const stored = AccountEmail.find({}, { _id: 1, role: 1, accountId: 1 })
			.sort({ _id: 1 })
			.setOptions({ signal, timeoutMS: 5000, timeoutMode: "iteration" })
			.lean<RegistryIdentity[]>()
			.cursor({ batchSize: 128 });
		try {
			for await (const identity of stored) {
				await checkpoint();
				const expected = index.get(identity._id);
				if (
					expected &&
					expected.role === identity.role &&
					expected.accountId === identity.accountId.toString()
				) {
					// Do not rewrite every already-valid identity or allocate an in-memory set.
					index.markVerified(identity._id);
				} else {
					await AccountEmail.deleteOne({
						_id: identity._id,
						role: identity.role,
						accountId: identity.accountId
					});
				}
			}
		} finally {
			await stored.close();
		}
		for (const identity of index.missing()) {
			await checkpoint();
			const accountId = new mongoose.Types.ObjectId(identity.accountId);
			// A concurrent different owner must cause a duplicate-key failure, never
			// an unconditional ownership overwrite.
			await AccountEmail.updateOne(
				{ _id: identity.email, role: identity.role, accountId },
				{ $setOnInsert: { role: identity.role, accountId } },
				{ upsert: true }
			);
			const stored = await AccountEmail.findById(identity.email).lean().exec();
			if (!stored || stored.role !== identity.role || !stored.accountId.equals(accountId)) {
				throw new Error("Login identity registry mismatch detected during startup");
			}
		}
	} finally {
		await index.dispose();
	}
}

export async function reserveIdentity(email: string, role: AccountRole, accountId: Types.ObjectId): Promise<void> {
	await AccountEmail.create({ _id: normalizeEmail(email), role, accountId });
}

export async function releaseIdentity(email: string, accountId: Types.ObjectId): Promise<void> {
	await AccountEmail.deleteOne({ _id: normalizeEmail(email), accountId });
}

export async function releaseAccountIdentities(accountId: Types.ObjectId): Promise<void> {
	await AccountEmail.deleteMany({ accountId });
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
	} catch (error) {
		if (accountWriteDefinitelyFailed(error)) await releaseIdentity(normalizedNew, accountId);
		throw error;
	}
	await releaseIdentity(normalizedOld, accountId);
}
