import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { HttpError, safeErrorSummary } from "../errors.js";
import { Admin } from "../models/schemas/Admin.js";
import { AdminWorkflowLock } from "../models/schemas/AdminWorkflowLock.js";
import { readRequestSignal } from "../runtimeCapacity.js";
import { serviceLog } from "../serviceLog.js";
import { workflowBusy, WorkflowCapacity } from "./workflowCapacity.js";

const LOCK_ID = "authorization-workflow";
const LOCK_DURATION_MS = 30_000;
const capacity = new WorkflowCapacity();

async function acquireLock(owner: string, deadline: number): Promise<void> {
	const signal = readRequestSignal();
	for (let attempt = 0; performance.now() < deadline; attempt += 1) {
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
				{
					upsert: true,
					returnDocument: "after",
					timeoutMS: Math.max(1, Math.ceil(deadline - performance.now()))
				}
			)
				.lean()
				.exec();
			if (lock?.owner === owner) return;
		} catch (error) {
			if (performance.now() >= deadline) throw workflowBusy();
			if (!(
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				(error as { code?: unknown }).code === 11000
			)) {
				throw error;
			}
		}
		await delay(Math.max(1, Math.min(25 * (attempt + 1), 100, deadline - performance.now())), undefined, {
			signal
		});
	}
	throw workflowBusy();
}

export async function withAuthorizationWorkflowLock<T>(operation: () => Promise<T>): Promise<T> {
	// The Mongo lease may expire during slow password work. It must never release
	// the process slot. Production remains one API with exclusive maintenance;
	// this does not make expiring leases a distributed transaction or fencing lock.
	return capacity.run(async (deadline) => {
		const owner = randomUUID();
		await acquireLock(owner, deadline);
		try {
			readRequestSignal()?.throwIfAborted();
			if (performance.now() >= deadline) throw workflowBusy();
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
	}, readRequestSignal());
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
