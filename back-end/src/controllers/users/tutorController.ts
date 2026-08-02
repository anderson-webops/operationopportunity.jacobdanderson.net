import type { RequestHandler } from "express";
import { HttpError, isVersionConflictError } from "../../errors.js";
import { Tutor } from "../../models/schemas/Tutor.js";
import { User } from "../../models/schemas/User.js";
import { objectIdParam } from "../../requestParams.js";
import { auditSecurityEvent } from "../../security/audit.js";
import { issueCsrfToken } from "../../security/csrf.js";
import { destroySession, regenerateSession, saveSession, setSessionIdentity } from "../../security/session.js";
import {
	createAccount,
	deleteAccount,
	serializeAccount,
	serializeTutorDirectory,
	updateAccount
} from "../../services/accountService.js";
import { requireCurrentAdminManager, withAuthorizationWorkflowLock } from "../../services/adminWorkflow.js";
import { parseAccountCreate, parseAccountUpdate, parseTutorStatus } from "../../validation.js";

export const createTutor: RequestHandler = async (req, res) => {
	if (req.session.identity) {
		throw new HttpError(409, "already_authenticated", "Sign out before creating another account.");
	}
	const tutor = await createAccount("tutor", parseAccountCreate(req.body));
	await regenerateSession(req);
	setSessionIdentity(req, "tutor", tutor._id.toString(), tutor.authVersion);
	const csrfToken = issueCsrfToken(req, res);
	await saveSession(req);
	auditSecurityEvent(req, "tutor.signup", {
		status: "success",
		targetRole: "tutor",
		targetId: tutor._id.toString()
	});
	res.status(201).json({ currentTutor: serializeAccount(tutor), csrfToken });
};

export const getTutorDirectory: RequestHandler = async (_req, res) => {
	const tutors = await Tutor.find({ status: "active" }, { _id: 1, name: 1, state: 1 }).sort({ name: 1 }).exec();
	res.json(tutors.map(serializeTutorDirectory));
};

export const getAllTutors: RequestHandler = async (_req, res) => {
	const tutors = await Tutor.find().sort({ createdAt: 1 }).exec();
	res.json(tutors.map(serializeAccount));
};

export const updateTutor: RequestHandler = async (req, res) => {
	const tutorId = objectIdParam(req.params.tutorID, res, "tutor");
	if (!tutorId) return;
	const tutor = await Tutor.findById(tutorId).exec();
	if (!tutor) throw new HttpError(404, "not_found", "Tutor account not found.");
	if (req.currentPrincipal?.role !== "tutor" || req.currentPrincipal.id !== tutorId) {
		throw new HttpError(403, "self_only", "Tutors may update only their own account.");
	}
	const input = parseAccountUpdate(req.body);
	const changesCredentials = input.email !== undefined || input.password !== undefined;
	const updated = await updateAccount(tutor, "tutor", input);
	if (req.currentPrincipal?.role === "tutor" && req.currentPrincipal.id === tutorId) {
		if (changesCredentials) await regenerateSession(req);
		setSessionIdentity(req, "tutor", tutorId, updated.authVersion);
		if (changesCredentials) issueCsrfToken(req, res);
		await saveSession(req);
	}
	auditSecurityEvent(req, "tutor.update", {
		status: "success",
		targetRole: "tutor",
		targetId: tutorId
	});
	res.json({ currentTutor: serializeAccount(updated) });
};

export const deleteTutor: RequestHandler = async (req, res) => {
	const tutorId = objectIdParam(req.params.tutorID, res, "tutor");
	if (!tutorId) return;
	const principal = req.currentPrincipal!;
	await withAuthorizationWorkflowLock(async () => {
		if (principal.role === "admin") {
			await requireCurrentAdminManager(principal.id, principal.authVersion);
		} else {
			const currentTutor = await Tutor.findById(principal.id).exec();
			if (
				principal.role !== "tutor" ||
				principal.id !== tutorId ||
				!currentTutor ||
				currentTutor.authVersion !== principal.authVersion
			) {
				throw new HttpError(
					403,
					"self_or_admin_required",
					"This tutor account or an admin manager is required."
				);
			}
		}

		const tutor = await Tutor.findById(tutorId).exec();
		if (!tutor) throw new HttpError(404, "not_found", "Tutor account not found.");
		await User.updateMany({ tutor: tutor._id }, { $set: { tutor: null } });
		await deleteAccount(tutor);
	});
	auditSecurityEvent(req, "tutor.delete", {
		status: "success",
		targetRole: "tutor",
		targetId: tutorId
	});
	if (req.currentPrincipal?.role === "tutor" && req.currentPrincipal.id === tutorId) {
		await destroySession(req);
	}
	res.sendStatus(204);
};

export const getLoggedInTutor: RequestHandler = (req, res) => {
	res.json({ currentTutor: serializeAccount(req.currentTutor!) });
};

export const updateTutorStatus: RequestHandler = async (req, res) => {
	const tutorId = objectIdParam(req.params.tutorID, res, "tutor");
	if (!tutorId) return;
	const status = parseTutorStatus(req.body);
	const actor = req.currentPrincipal!;
	const tutor = await withAuthorizationWorkflowLock(async () => {
		await requireCurrentAdminManager(actor.id, actor.authVersion);
		const target = await Tutor.findById(tutorId).exec();
		if (!target) throw new HttpError(404, "not_found", "Tutor account not found.");
		if (target.status === status) return target;
		target.status = status;
		target.authVersion += 1;
		try {
			await target.save();
		} catch (error) {
			if (isVersionConflictError(error)) {
				throw new HttpError(
					409,
					"stale_update",
					"The tutor changed during this request. Reload and try again."
				);
			}
			throw error;
		}
		if (status === "suspended") {
			await User.updateMany({ tutor: target._id }, { $set: { tutor: null } });
		}
		return target;
	});
	auditSecurityEvent(req, status === "active" ? "tutor.promote" : "tutor.demote", {
		status: "success",
		targetRole: "tutor",
		targetId: tutorId
	});
	res.json({ tutor: serializeAccount(tutor) });
};
