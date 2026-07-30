import type { Request } from "express";
import { createHash } from "node:crypto";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { normalizeEmail } from "../validation.js";

function ipKey(req: Request): string {
	return ipKeyGenerator(req.ip || req.socket.remoteAddress || "127.0.0.1");
}

function loginAccountKey(req: Request): string {
	const email = typeof req.body?.email === "string"
		? normalizeEmail(req.body.email).slice(0, 254)
		: "invalid";
	return `account:${createHash("sha256").update(email).digest("hex")}`;
}

function createLimiter(
	windowMs: number,
	limit: number,
	keyGenerator: (req: Request) => string = ipKey
) {
	return rateLimit({
		windowMs,
		limit,
		standardHeaders: "draft-8",
		legacyHeaders: false,
		keyGenerator,
		handler: (_req, res) => {
			res.status(429).set("Cache-Control", "no-store").json({
				error: "rate_limited",
				message: "Too many requests. Please try again later."
			});
		}
	});
}

export const loginRateLimit = createLimiter(15 * 60 * 1000, 10);
export const loginAccountRateLimit = createLimiter(
	15 * 60 * 1000,
	20,
	loginAccountKey
);
export const signupRateLimit = createLimiter(60 * 60 * 1000, 10);
export const publicReadRateLimit = createLimiter(60 * 1000, 120);
export const healthReadRateLimit = createLimiter(60 * 1000, 300);
export const authenticatedMutationRateLimit = createLimiter(60 * 1000, 60);
export const credentialMutationRateLimit = createLimiter(15 * 60 * 1000, 10);
