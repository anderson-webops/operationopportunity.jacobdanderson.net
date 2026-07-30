import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { HttpError } from "../../errors.js";
import { Tutor } from "../../models/schemas/Tutor.js";
import { User } from "../../models/schemas/User.js";
import { objectIdParam } from "../../requestParams.js";
import { auditSecurityEvent } from "../../security/audit.js";
import { issueCsrfToken } from "../../security/csrf.js";
import {
	canAssignTutor,
	canStaffUpdateUser,
	canUserMutateSelf
} from "../../security/policies.js";
import {
	destroySession,
	regenerateSession,
	saveSession,
	setSessionIdentity
} from "../../security/session.js";
import {
	createAccount,
	deleteAccount,
	serializeAccount,
	updateAccount
} from "../../services/accountService.js";
import {
	parseAccountCreate,
	parseAccountUpdate,
	parseStaffUserUpdate
} from "../../validation.js";

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
	const users = await User.find({ tutor: tutorId }).sort({ createdAt: 1 }).exec();
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
	if (!req.currentPrincipal
		|| !canUserMutateSelf(req.currentPrincipal.role, req.currentPrincipal.id, target.userId)) {
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
	const target = await updateTargetUser(req, res);
	if (!target) return;
	const principal = req.currentPrincipal!;
	if (!canStaffUpdateUser(
		principal.role,
		principal.id,
		target.user.tutor?.toString() || null
	)) {
		throw new HttpError(403, "not_assigned", "Tutors may update only users assigned to them.");
	}
	const updated = await updateAccount(target.user, "user", parseStaffUserUpdate(req.body));
	auditSecurityEvent(req, "user.update_by_staff", {
		status: "success",
		targetRole: "user",
		targetId: target.userId
	});
	res.json({ user: serializeAccount(updated) });
};

export const assignTutorToUser: RequestHandler = async (req, res) => {
	const userId = objectIdParam(req.params.userID, res, "user");
	const tutorId = objectIdParam(req.params.tutorID, res, "tutor");
	if (!userId || !tutorId) return;
	const principal = req.currentPrincipal!;
	if (!canAssignTutor(principal.role, principal.id, userId)) {
		throw new HttpError(403, "self_only", "Users may select a tutor only for their own account.");
	}
	if (!await Tutor.exists({ _id: tutorId, status: "active" })) {
		throw new HttpError(404, "not_found", "Tutor account not found.");
	}
	const user = await User.findById(userId).exec();
	if (!user) throw new HttpError(404, "not_found", "User account not found.");
	user.tutor = new Types.ObjectId(tutorId);
	await user.save();
	if (!await Tutor.exists({ _id: tutorId, status: "active" })) {
		await User.updateOne(
			{ _id: userId, tutor: tutorId },
			{ $set: { tutor: null } }
		);
		throw new HttpError(
			409,
			"tutor_status_changed",
			"The tutor is no longer active. Please choose another tutor."
		);
	}
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
	if (!canAssignTutor(principal.role, principal.id, userId)) {
		throw new HttpError(403, "self_only", "Users may delete only their own account.");
	}
	const user = await User.findById(userId).exec();
	if (!user) throw new HttpError(404, "not_found", "User account not found.");
	await deleteAccount(user);
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
