import type { RequestHandler } from "express";
import type { AppConfig } from "../../config.js";
import type { AccountDocument, AccountRole } from "../../types/account.js";
import argon2 from "argon2";
import { Admin } from "../../models/schemas/Admin.js";
import { Tutor } from "../../models/schemas/Tutor.js";
import { User } from "../../models/schemas/User.js";
import { auditSecurityEvent } from "../../security/audit.js";
import { issueCsrfToken } from "../../security/csrf.js";
import {
	destroySession,
	regenerateSession,
	saveSession,
	setSessionIdentity
} from "../../security/session.js";
import { serializeAccount } from "../../services/accountService.js";
import { isValidEmail, normalizeEmail } from "../../validation.js";

const dummyHash = argon2.hash("operation-opportunity-dummy-password", {
	type: argon2.argon2id,
	memoryCost: 65_536,
	timeCost: 3,
	parallelism: 1
});

function config(req: Parameters<RequestHandler>[0]): AppConfig {
	return req.app.get("config") as AppConfig;
}

async function findLoginCandidates(email: string): Promise<Array<{ role: AccountRole; account: AccountDocument }>> {
	const [user, tutor, admin] = await Promise.all([
		User.findOne({ email }).select("+password").exec(),
		Tutor.findOne({ email }).select("+password").exec(),
		Admin.findOne({ email }).select("+password").exec()
	]);
	return [
		...(user ? [{ role: "user" as const, account: user }] : []),
		...(tutor ? [{ role: "tutor" as const, account: tutor }] : []),
		...(admin ? [{ role: "admin" as const, account: admin }] : [])
	];
}

export const login: RequestHandler = async (req, res) => {
	const email = typeof req.body?.email === "string" ? normalizeEmail(req.body.email) : "";
	const password = typeof req.body?.password === "string" ? req.body.password : "";
	const remember = req.body?.remember === true;
	if (!isValidEmail(email) || password.length < 1 || password.length > 128) {
		await argon2.verify(await dummyHash, password || "invalid");
		auditSecurityEvent(req, "login", { status: "rejected", reason: "invalid_input" });
		return res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password." });
	}

	const candidates = await findLoginCandidates(email);
	if (candidates.length !== 1) {
		await argon2.verify(await dummyHash, password);
		auditSecurityEvent(req, "login", {
			status: "rejected",
			reason: candidates.length > 1 ? "identity_invariant" : "invalid_credentials"
		});
		return res.status(candidates.length > 1 ? 503 : 401).json({
			error: candidates.length > 1 ? "authentication_unavailable" : "invalid_credentials",
			message: candidates.length > 1 ? "Authentication is temporarily unavailable." : "Invalid email or password."
		});
	}

	const candidate = candidates[0]!;
	if (!(await candidate.account.comparePassword(password))) {
		auditSecurityEvent(req, "login", { status: "rejected", reason: "invalid_credentials" });
		return res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password." });
	}

	await regenerateSession(req);
	setSessionIdentity(
		req,
		candidate.role,
		candidate.account._id.toString(),
		candidate.account.authVersion
	);
	req.session.cookie.maxAge = remember
		? config(req).sessionRememberMaxAgeMs
		: config(req).sessionMaxAgeMs;
	const csrfToken = issueCsrfToken(req, res);
	await saveSession(req);
	req.currentPrincipal = {
		id: candidate.account._id.toString(),
		role: candidate.role,
		authVersion: candidate.account.authVersion,
		account: candidate.account
	};
	auditSecurityEvent(req, "login", { status: "success" });

	const responseKey = candidate.role === "admin"
		? "currentAdmin"
		: candidate.role === "tutor"
			? "currentTutor"
			: "currentUser";
	return res.json({ [responseKey]: serializeAccount(candidate.account), csrfToken });
};

export const logout: RequestHandler = async (req, res) => {
	auditSecurityEvent(req, "logout", { status: "success" });
	await destroySession(req);
	res.clearCookie(config(req).sessionCookieName, { path: "/" });
	return res.sendStatus(204);
};

export const getCsrfToken: RequestHandler = async (req, res) => {
	const csrfToken = issueCsrfToken(req, res);
	await saveSession(req);
	res.set("Cache-Control", "no-store").json({ csrfToken });
};

export const getCurrentSession: RequestHandler = (req, res) => {
	const identity = req.currentPrincipal;
	res.set("Cache-Control", "no-store").json({
		role: identity?.role || null,
		accountId: identity?.id || null,
		adminID: identity?.role === "admin" ? identity.id : null,
		tutorID: identity?.role === "tutor" ? identity.id : null,
		userID: identity?.role === "user" ? identity.id : null
	});
};
