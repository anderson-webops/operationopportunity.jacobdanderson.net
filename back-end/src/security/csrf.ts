import type { Request, RequestHandler, Response } from "express";
import { Buffer } from "node:buffer";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { auditSecurityEvent } from "./audit.js";

function safeEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueCsrfToken(req: Request, res: Response): string {
	const token = req.session.csrfToken || randomBytes(32).toString("base64url");
	if (!req.session.csrfToken) req.session.csrfToken = token;
	res.setHeader("X-CSRF-Token", token);
	return token;
}

export function csrfProtection(publicOrigin: string): RequestHandler {
	return (req, res, next) => {
		if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

		const origin = req.get("origin");
		const fetchSite = req.get("sec-fetch-site");
		const supplied = req.get("x-csrf-token");
		const expected = req.session.csrfToken;

		if (
			origin !== publicOrigin ||
			fetchSite === "cross-site" ||
			!supplied ||
			!expected ||
			!safeEqual(supplied, expected)
		) {
			auditSecurityEvent(req, "csrf.reject", {
				status: "rejected",
				reason: "origin_or_token"
			});
			return res.status(403).set("Cache-Control", "no-store").json({
				error: "request_rejected",
				message: "Request origin or CSRF token is invalid."
			});
		}

		next();
	};
}
