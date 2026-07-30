import type { Request, RequestHandler } from "express";
import type { AccountDocument, AccountRole } from "../types/account.js";
import { safeErrorSummary } from "../errors.js";
import { Admin } from "../models/schemas/Admin.js";
import { Tutor } from "../models/schemas/Tutor.js";
import { User } from "../models/schemas/User.js";
import { stringParam } from "../requestParams.js";
import { auditSecurityEvent } from "../security/audit.js";
import { destroySession } from "../security/session.js";

async function findAccount(role: AccountRole, id: string): Promise<AccountDocument | null> {
	if (role === "admin") return Admin.findById(id).exec();
	if (role === "tutor") return Tutor.findById(id).exec();
	return User.findById(id).exec();
}

async function clearInvalidSession(req: Request) {
	try {
		await destroySession(req);
	}
	catch {
		// Authentication still fails closed if session-store cleanup is unavailable.
	}
}

async function hydratePrincipal(req: Request): Promise<boolean> {
	const identity = req.session.identity;
	if (!identity) return false;

	const account = await findAccount(identity.role, identity.id);
	if (!account || account.authVersion !== identity.authVersion) {
		await clearInvalidSession(req);
		return false;
	}

	req.currentPrincipal = {
		id: account._id.toString(),
		role: identity.role,
		authVersion: account.authVersion,
		account
	};
	if (identity.role === "admin") req.currentAdmin = account as InstanceType<typeof Admin>;
	if (identity.role === "tutor") req.currentTutor = account as InstanceType<typeof Tutor>;
	if (identity.role === "user") req.currentUser = account as InstanceType<typeof User>;
	return true;
}

function authenticationUnavailable(
	req: Request,
	res: Parameters<RequestHandler>[1],
	error: unknown
) {
	console.error("Principal validation failed", {
		requestId: req.requestId,
		error: safeErrorSummary(error)
	});
	return res.status(503).set("Cache-Control", "no-store").json({
		error: "authentication_unavailable",
		message: "Authentication is temporarily unavailable."
	});
}

export const optionalPrincipal: RequestHandler = async (req, res, next) => {
	try {
		await hydratePrincipal(req);
		next();
	}
	catch (error) {
		return authenticationUnavailable(req, res, error);
	}
};

export const validPrincipal: RequestHandler = async (req, res, next) => {
	const hadIdentity = Boolean(req.session.identity);
	try {
		if (await hydratePrincipal(req)) return next();
		if (hadIdentity) {
			auditSecurityEvent(req, "session.reject", {
				status: "rejected",
				reason: "expired_or_revoked"
			});
		}
		return res.status(401).set("Cache-Control", "no-store").json({
			error: hadIdentity ? "session_expired" : "authentication_required",
			message: hadIdentity ? "The session is no longer valid." : "Sign in is required."
		});
	}
	catch (error) {
		return authenticationUnavailable(req, res, error);
	}
};

function requireRole(role: AccountRole): RequestHandler[] {
	return [
		validPrincipal,
		(req, res, next) => {
			if (req.currentPrincipal?.role !== role) {
				auditSecurityEvent(req, "authorization.reject", {
					status: "rejected",
					targetRole: role,
					reason: "role_required"
				});
				return res.status(403).json({
					error: "insufficient_privilege",
					message: `A ${role} account is required.`
				});
			}
			next();
		}
	];
}

export const validUser = requireRole("user");
export const validTutor = requireRole("tutor");
export const validAdmin = requireRole("admin");

export const validAdminManager: RequestHandler[] = [
	...validAdmin,
	(req, res, next) => {
		if (!req.currentAdmin?.editAdmins) {
			auditSecurityEvent(req, "authorization.reject", {
				status: "rejected",
				targetRole: "admin",
				reason: "admin_management_required"
			});
			return res.status(403).json({
				error: "admin_management_required",
				message: "Admin-management privilege is required."
			});
		}
		next();
	}
];

export const validTutorOrAdmin: RequestHandler[] = [
	validPrincipal,
	(req, res, next) => {
		const principal = req.currentPrincipal;
		const tutorId = stringParam(req.params.tutorID);
		if (principal?.role === "admin") return next();
		if (principal?.role === "tutor" && principal.id === tutorId) return next();
		auditSecurityEvent(req, "authorization.reject", {
			status: "rejected",
			targetRole: "tutor",
			targetId: tutorId,
			reason: "self_or_admin_required"
		});
		return res.status(403).json({
			error: "insufficient_privilege",
			message: "This tutor account or an admin account is required."
		});
	}
];

export const validActiveTutorOrAdmin: RequestHandler[] = [
	validPrincipal,
	(req, res, next) => {
		const tutorId = stringParam(req.params.tutorID);
		if (req.currentPrincipal?.role === "admin") return next();
		if (req.currentPrincipal?.role === "tutor"
			&& req.currentTutor?.status === "active"
			&& (!tutorId || req.currentPrincipal.id === tutorId)) {
			return next();
		}
		auditSecurityEvent(req, "authorization.reject", {
			status: "rejected",
			targetRole: "tutor",
			targetId: tutorId,
			reason: "active_tutor_or_admin_required"
		});
		return res.status(403).json({
			error: "active_tutor_required",
			message: "An active tutor account or an admin account is required."
		});
	}
];
