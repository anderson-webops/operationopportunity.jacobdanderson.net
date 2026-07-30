import { randomUUID } from "node:crypto";
import { HttpError, safeErrorSummary } from "../errors.js";
import { AdminWorkflowLock } from "../models/schemas/AdminWorkflowLock.js";

const LOCK_DURATION_MS = 30_000;
const LOCK_ATTEMPTS = 5;

async function acquireLock(owner: string): Promise<void> {
	for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
		try {
			const lock = await AdminWorkflowLock.findOneAndUpdate(
				{
					_id: "admin-membership",
					$or: [
						{ expiresAt: { $lte: now } },
						{ owner }
					]
				},
				{ $set: { owner, expiresAt } },
				{ upsert: true, returnDocument: "after" }
			).lean().exec();
			if (lock?.owner === owner) return;
		}
		catch (error) {
			if (!(typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000)) {
				throw error;
			}
		}
		await new Promise(resolve => setTimeout(resolve, 20 * (attempt + 1)));
	}
	throw new HttpError(
		503,
		"admin_workflow_busy",
		"Admin membership is temporarily busy. Please retry."
	);
}

export async function withAdminWorkflowLock<T>(operation: () => Promise<T>): Promise<T> {
	const owner = randomUUID();
	await acquireLock(owner);
	try {
		return await operation();
	}
	finally {
		try {
			await AdminWorkflowLock.deleteOne({ _id: "admin-membership", owner });
		}
		catch (error) {
			console.error("Admin workflow lock release failed", safeErrorSummary(error));
		}
	}
}
