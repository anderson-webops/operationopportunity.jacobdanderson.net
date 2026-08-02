import type { RequestHandler } from "express";
import { HttpError } from "../../errors.js";
import { Admin } from "../../models/schemas/Admin.js";
import { objectIdParam } from "../../requestParams.js";
import { auditSecurityEvent } from "../../security/audit.js";
import { issueCsrfToken } from "../../security/csrf.js";
import { adminRemovalBlockReason } from "../../security/policies.js";
import { destroySession, regenerateSession, saveSession, setSessionIdentity } from "../../security/session.js";
import { createAccount, deleteAccount, serializeAccount, updateAccount } from "../../services/accountService.js";
import { requireCurrentAdminManager, withAuthorizationWorkflowLock } from "../../services/adminWorkflow.js";
import { parseAdminCreate, parseAdminPeerPrivilegeUpdate, parseAdminUpdate } from "../../validation.js";

export const createAdmin: RequestHandler = async (req, res) => {
	const input = parseAdminCreate(req.body);
	const actorId = req.currentAdmin!._id.toString();
	const actorAuthVersion = req.currentPrincipal!.authVersion;
	const admin = await withAuthorizationWorkflowLock(async () => {
		await requireCurrentAdminManager(actorId, actorAuthVersion);
		return createAccount("admin", input);
	});
	auditSecurityEvent(req, "admin.create", {
		status: "success",
		targetRole: "admin",
		targetId: admin._id.toString()
	});
	res.status(201).json({ admin: serializeAccount(admin) });
};

export const getAllAdmins: RequestHandler = async (_req, res) => {
	const admins = await Admin.find().sort({ createdAt: 1 }).exec();
	res.json(admins.map(serializeAccount));
};

export const updateAdmin: RequestHandler = async (req, res) => {
	const adminId = objectIdParam(req.params.adminID, res, "admin");
	if (!adminId) return;
	const actor = req.currentAdmin!;
	const actorId = actor._id.toString();
	const actorAuthVersion = req.currentPrincipal!.authVersion;
	const isSelf = actor._id.toString() === adminId;
	if (!isSelf && !actor.editAdmins) {
		auditSecurityEvent(req, "admin.update", {
			status: "rejected",
			targetRole: "admin",
			targetId: adminId,
			reason: "admin_management_required"
		});
		throw new HttpError(403, "admin_management_required", "Admin-management privilege is required.");
	}

	const input = isSelf ? parseAdminUpdate(req.body, actor.editAdmins) : parseAdminPeerPrivilegeUpdate(req.body);
	const changesCredentials = input.email !== undefined || input.password !== undefined;
	const admin = await withAuthorizationWorkflowLock(async () => {
		const currentActor = await Admin.findById(actorId).exec();
		if (!currentActor || currentActor.authVersion !== actorAuthVersion) {
			throw new HttpError(401, "session_expired", "The session is no longer valid.");
		}
		if ((!isSelf || input.editAdmins !== undefined) && !currentActor.editAdmins) {
			throw new HttpError(403, "admin_management_required", "Admin-management privilege is required.");
		}
		const target = isSelf ? currentActor : await Admin.findById(adminId).exec();
		if (!target) throw new HttpError(404, "not_found", "Admin account not found.");

		if (target.editAdmins && input.editAdmins === false) {
			const managers = await Admin.countDocuments({ editAdmins: true });
			if (managers <= 1) {
				throw new HttpError(409, "last_admin_manager", "At least one admin manager must remain.");
			}
		}

		return updateAccount(target, "admin", input);
	});

	if (isSelf && req.session.identity) {
		if (changesCredentials) await regenerateSession(req);
		setSessionIdentity(req, "admin", admin._id.toString(), admin.authVersion);
		if (changesCredentials) issueCsrfToken(req, res);
		await saveSession(req);
	}
	const auditEvent =
		input.editAdmins === undefined
			? "admin.update"
			: input.editAdmins
				? "admin.manager_grant"
				: "admin.manager_revoke";
	auditSecurityEvent(req, auditEvent, {
		status: "success",
		targetRole: "admin",
		targetId: adminId
	});
	res.json({ currentAdmin: serializeAccount(admin) });
};

export const deleteAdmin: RequestHandler = async (req, res) => {
	const adminId = objectIdParam(req.params.adminID, res, "admin");
	if (!adminId) return;
	const actor = req.currentAdmin!;
	const actorId = actor._id.toString();
	const actorAuthVersion = req.currentPrincipal!.authVersion;
	const isSelf = actorId === adminId;

	await withAuthorizationWorkflowLock(async () => {
		const currentActor = await Admin.findById(actorId).exec();
		if (!currentActor || currentActor.authVersion !== actorAuthVersion) {
			throw new HttpError(401, "session_expired", "The session is no longer valid.");
		}
		if (!isSelf && !currentActor.editAdmins) {
			throw new HttpError(403, "admin_management_required", "Admin-management privilege is required.");
		}
		const target = isSelf ? currentActor : await Admin.findById(adminId).exec();
		if (!target) throw new HttpError(404, "not_found", "Admin account not found.");
		const blockReason = adminRemovalBlockReason(
			await Admin.countDocuments(),
			await Admin.countDocuments({ editAdmins: true }),
			target.editAdmins
		);
		if (blockReason === "last_admin") {
			throw new HttpError(409, blockReason, "The last admin account cannot be deleted.");
		}
		if (blockReason === "last_admin_manager") {
			throw new HttpError(409, blockReason, "The last admin manager cannot be deleted.");
		}
		await deleteAccount(target);
	});

	auditSecurityEvent(req, "admin.delete", {
		status: "success",
		targetRole: "admin",
		targetId: adminId
	});
	if (isSelf) await destroySession(req);
	res.sendStatus(204);
};

export const getLoggedInAdmin: RequestHandler = (req, res) => {
	res.json({ currentAdmin: serializeAccount(req.currentAdmin!) });
};
