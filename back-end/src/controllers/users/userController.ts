import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { HttpError, isVersionConflictError } from "../../errors.js";
import { Admin } from "../../models/schemas/Admin.js";
import { Tutor } from "../../models/schemas/Tutor.js";
import { User } from "../../models/schemas/User.js";
import { objectIdParam } from "../../requestParams.js";
import { auditSecurityEvent } from "../../security/audit.js";
import { issueCsrfToken } from "../../security/csrf.js";
import { canAssignTutor, canStaffUpdateUser, canUserMutateSelf } from "../../security/policies.js";
import { destroySession, regenerateSession, saveSession, setSessionIdentity } from "../../security/session.js";
import { createAccount, deleteAccount, serializeAccount, updateAccount } from "../../services/accountService.js";
import { withAuthorizationWorkflowLock } from "../../services/adminWorkflow.js";
import { parseAccountCreate, parseAccountUpdate, parseStaffUserUpdate } from "../../validation.js";

export const createUser: RequestHandler = async (req, res) => {
	if (req.session.identity) {
		throw new HttpError(409, "already_authenticated", "Sign out before creating another account.");
	}
	const user = await createAccount("user", parseAccountCreate(req.body));
	await regenerateSession(req);
	setSessionIdentity(req, "user", user._id.toString(), user.authVersion);
	const csrfToken = issueCsrfToken(req, res);
	await saveSession(req);
	auditSecurityEvent(req, "user.signup", {
		status: "success",
		targetRole: "user",
		targetId: user._id.toString()
	});
	res.status(201).json({ currentUser: serializeAccount(user), csrfToken });
};

export const getAllUsers: RequestHandler = async (_req, res) => {
	const users = await User.find().sort({ createdAt: 1 }).exec();
	res.json(users.map(serializeAccount));
};

export const getUsersOfTutor: RequestHandler = async (req, res) => {
	const tutorId = objectIdParam(req.params.tutorID, res, "tutor");
	if (!tutorId) return;
	const principal = req.currentPrincipal!;
	const users = await withAuthorizationWorkflowLock(async () => {
		if (principal.role === "tutor") {
			const tutor = await Tutor.findOne({
				_id: principal.id,
				status: "active",
				authVersion: principal.authVersion
			}).exec();
			if (!tutor || principal.id !== tutorId) {
				throw new HttpError(403, "active_tutor_required", "An active tutor account is required.");
			}
		} else {
			const admin = await Admin.findOne({ _id: principal.id, authVersion: principal.authVersion }).exec();
			if (!admin) throw new HttpError(401, "session_expired", "The session is no longer valid.");
		}
		return User.find({ tutor: tutorId }).sort({ createdAt: 1 }).exec();
	});
	res.json(users.map(serializeAccount));
};

async function updateTargetUser(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) {
	const userId = objectIdParam(req.params.userID, res, "user");
	if (!userId) return null;
	const user = await User.findById(userId).exec();
	if (!user) throw new HttpError(404, "not_found", "User account not found.");
	return { userId, user };
}

export const updateOwnUser: RequestHandler = async (req, res) => {
	const target = await updateTargetUser(req, res);
	if (!target) return;
	if (
		!req.currentPrincipal ||
		!canUserMutateSelf(req.currentPrincipal.role, req.currentPrincipal.id, target.userId)
	) {
		throw new HttpError(403, "self_only", "Users may update only their own account.");
	}
	const input = parseAccountUpdate(req.body);
	const changesCredentials = input.email !== undefined || input.password !== undefined;
	const updated = await updateAccount(target.user, "user", input);
	if (changesCredentials) await regenerateSession(req);
	setSessionIdentity(req, "user", target.userId, updated.authVersion);
	if (changesCredentials) issueCsrfToken(req, res);
	await saveSession(req);
	auditSecurityEvent(req, "user.update", {
		status: "success",
		targetRole: "user",
		targetId: target.userId
	});
	res.json({ currentUser: serializeAccount(updated) });
};

export const updateAssignedUser: RequestHandler = async (req, res) => {
	const principal = req.currentPrincipal!;
	const userId = objectIdParam(req.params.userID, res, "user");
	if (!userId) return;
	const input = parseStaffUserUpdate(req.body);
	const updated = await withAuthorizationWorkflowLock(async () => {
		if (principal.role === "tutor") {
			const tutor = await Tutor.findOne({
				_id: principal.id,
				status: "active",
				authVersion: principal.authVersion
			}).exec();
			if (!tutor) throw new HttpError(403, "active_tutor_required", "An active tutor account is required.");
		} else {
			const admin = await Admin.findOne({ _id: principal.id, authVersion: principal.authVersion }).exec();
			if (!admin) throw new HttpError(401, "session_expired", "The session is no longer valid.");
		}
		const user = await User.findById(userId).exec();
		if (!user) throw new HttpError(404, "not_found", "User account not found.");
		if (!canStaffUpdateUser(principal.role, principal.id, user.tutor?.toString() || null)) {
			throw new HttpError(403, "not_assigned", "Tutors may update only users assigned to them.");
		}
		return updateAccount(user, "user", input);
	});
	auditSecurityEvent(req, "user.update_by_staff", {
		status: "success",
		targetRole: "user",
		targetId: userId
	});
	res.json({ user: serializeAccount(updated) });
};

export const assignTutorToUser: RequestHandler = async (req, res) => {
	const userId = objectIdParam(req.params.userID, res, "user");
	const tutorId = objectIdParam(req.params.tutorID, res, "tutor");
	if (!userId || !tutorId) return;
	const principal = req.currentPrincipal!;
	const user = await withAuthorizationWorkflowLock(async () => {
		if (!canAssignTutor(principal.role, principal.id, userId)) {
			throw new HttpError(403, "self_only", "Users may select a tutor only for their own account.");
		}
		if (principal.role === "admin") {
			const admin = await Admin.findOne({ _id: principal.id, authVersion: principal.authVersion }).exec();
			if (!admin) throw new HttpError(401, "session_expired", "The session is no longer valid.");
		} else {
			const actor = await User.findOne({ _id: principal.id, authVersion: principal.authVersion }).exec();
			if (!actor) throw new HttpError(401, "session_expired", "The session is no longer valid.");
		}
		if (!(await Tutor.exists({ _id: tutorId, status: "active" }))) {
			throw new HttpError(404, "not_found", "Tutor account not found.");
		}
		const target = await User.findById(userId).exec();
		if (!target) throw new HttpError(404, "not_found", "User account not found.");
		target.tutor = new Types.ObjectId(tutorId);
		try {
			await target.save();
		} catch (error) {
			if (isVersionConflictError(error)) {
				throw new HttpError(409, "stale_update", "The user changed during this request. Reload and try again.");
			}
			throw error;
		}
		return target;
	});
	auditSecurityEvent(req, "user.assign_tutor", {
		status: "success",
		targetRole: "user",
		targetId: userId
	});
	res.json({ currentUser: serializeAccount(user) });
};

export const deleteUser: RequestHandler = async (req, res) => {
	const userId = objectIdParam(req.params.userID, res, "user");
	if (!userId) return;
	const principal = req.currentPrincipal!;
	await withAuthorizationWorkflowLock(async () => {
		if (!canAssignTutor(principal.role, principal.id, userId)) {
			throw new HttpError(403, "self_only", "Users may delete only their own account.");
		}
		if (principal.role === "admin") {
			const admin = await Admin.findOne({ _id: principal.id, authVersion: principal.authVersion }).exec();
			if (!admin) throw new HttpError(401, "session_expired", "The session is no longer valid.");
		}
		const user = await User.findById(userId).exec();
		if (!user || (principal.role === "user" && user.authVersion !== principal.authVersion)) {
			throw new HttpError(404, "not_found", "User account not found.");
		}
		await deleteAccount(user);
	});
	auditSecurityEvent(req, "user.delete", {
		status: "success",
		targetRole: "user",
		targetId: userId
	});
	if (principal.role === "user") await destroySession(req);
	res.sendStatus(204);
};

export const getLoggedInUser: RequestHandler = (req, res) => {
	res.json({ currentUser: serializeAccount(req.currentUser!) });
};
