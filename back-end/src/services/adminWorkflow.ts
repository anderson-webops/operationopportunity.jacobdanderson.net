import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { HttpError, safeErrorSummary } from "../errors.js";
import { Admin } from "../models/schemas/Admin.js";
import { AdminWorkflowLock } from "../models/schemas/AdminWorkflowLock.js";
import { readRequestSignal } from "../runtimeCapacity.js";
import { serviceLog } from "../serviceLog.js";

const LOCK_ID = "authorization-workflow";
const LOCK_DURATION_MS = 30_000;
const LOCK_ATTEMPTS = 50;

async function acquireLock(owner: string): Promise<void> {
	const signal = readRequestSignal();
	for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
		signal?.throwIfAborted();
		const now = new Date();
		const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
		try {
			const lock = await AdminWorkflowLock.findOneAndUpdate(
				{
					_id: LOCK_ID,
					$or: [{ expiresAt: { $lte: now } }, { owner }]
				},
				{ $set: { owner, expiresAt } },
				{ upsert: true, returnDocument: "after" }
			)
				.lean()
				.exec();
			if (lock?.owner === owner) return;
		} catch (error) {
			if (!(
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				(error as { code?: unknown }).code === 11000
			)) {
				throw error;
			}
		}
		await delay(Math.min(25 * (attempt + 1), 100), undefined, { signal });
	}
	throw new HttpError(
		503,
		"authorization_workflow_busy",
		"An authorization change is temporarily busy. Please retry."
	);
}

export async function withAuthorizationWorkflowLock<T>(operation: () => Promise<T>): Promise<T> {
	const owner = randomUUID();
	await acquireLock(owner);
	try {
		return await operation();
	} finally {
		try {
			await AdminWorkflowLock.deleteOne({ _id: LOCK_ID, owner });
		} catch (error) {
			serviceLog.write({
				level: "error",
				message: "Authorization workflow lock release failed",
				error: safeErrorSummary(error)
			});
		}
	}
}

export async function requireCurrentAdminManager(
	adminId: string,
	expectedAuthVersion: number
): Promise<InstanceType<typeof Admin>> {
	const admin = await Admin.findById(adminId).exec();
	if (!admin || admin.authVersion !== expectedAuthVersion) {
		throw new HttpError(401, "session_expired", "The session is no longer valid.");
	}
	if (!admin.editAdmins) {
		throw new HttpError(403, "admin_management_required", "Admin-management privilege is required.");
	}
	return admin;
}
