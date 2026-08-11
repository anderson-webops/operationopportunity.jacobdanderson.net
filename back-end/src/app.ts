import type { Store } from "express-session";
import type { AppConfig } from "./config.js";
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import mongoose from "mongoose";
import { createQuoteProxy } from "./controllers/common/quoteProxy.js";
import { HttpError, isDuplicateKeyError, safeErrorSummary } from "./errors.js";
import { publicReadRateLimit } from "./middleware/rateLimit.js";
import { getDeploymentIdentity } from "./release.js";
import { accountRoutes } from "./routes/accountRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { tutorRoutes } from "./routes/tutorRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { csrfProtection } from "./security/csrf.js";
import { requestContext } from "./security/requestContext.js";

function secureEqual(left: string | undefined, right: string | undefined): boolean {
	if (!left || !right) return false;
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

interface AppDependencies {
	getReadiness?: () => Promise<boolean>;
}

async function getMongoReadiness() {
	const state = mongoose.connection.readyState;
	if (state !== 1 || !mongoose.connection.db) return false;

	try {
		await mongoose.connection.db.admin().ping();
		return true;
	} catch {
		return false;
	}
}

export function createApp(config: AppConfig, store?: Store, dependencies: AppDependencies = {}) {
	if (config.isProduction && !store) {
		throw new Error("Production requires an external session store.");
	}
	const app = express();
	const checkReadiness = dependencies.getReadiness ?? getMongoReadiness;
	app.disable("x-powered-by");
	app.set("config", config);
	app.set("trust proxy", config.trustedProxyIps.length ? config.trustedProxyIps : false);
	app.use(requestContext);
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'none'"],
					baseUri: ["'none'"],
					frameAncestors: ["'none'"],
					formAction: ["'none'"]
				}
			},
			crossOriginResourcePolicy: { policy: "same-site" },
			frameguard: { action: "deny" },
			hsts: config.isProduction
		})
	);
	app.use((_req, res, next) => {
		res.setHeader("Cache-Control", "no-store");
		next();
	});

	const sendProbe = (request: express.Request, response: express.Response, ok: boolean) => {
		const probe = response.status(ok ? 200 : 503);
		return request.method === "HEAD" ? probe.end() : probe.json({ ok });
	};
	const healthHandler: express.RequestHandler = (request, response) => sendProbe(request, response, true);
	const readinessHandler: express.RequestHandler = async (request, response) => {
		try {
			return sendProbe(request, response, await checkReadiness());
		} catch {
			return sendProbe(request, response, false);
		}
	};
	app.head("/healthz", healthHandler);
	app.get("/healthz", healthHandler);
	app.head("/readyz", readinessHandler);
	app.get("/readyz", readinessHandler);

	app.use(express.json({ limit: config.requestBodyLimit, strict: true }));
	app.use(
		session({
			name: config.sessionCookieName,
			secret: config.sessionSecrets,
			store,
			resave: false,
			saveUninitialized: false,
			rolling: true,
			proxy: config.trustedProxyIps.length > 0,
			cookie: {
				httpOnly: true,
				secure: config.isProduction,
				sameSite: "lax",
				path: "/",
				maxAge: config.sessionMaxAgeMs
			}
		})
	);
	app.use(csrfProtection(config.publicOrigin));

	app.get("/_dbinfo", (req, res) => {
		if (
			!config.enableInternalDiagnostics ||
			!secureEqual(req.get("x-internal-diagnostics-key"), config.internalDiagnosticsKey)
		) {
			return res.status(404).json({ error: "not_found" });
		}
		res.json({
			databaseName: mongoose.connection.db?.databaseName ?? null,
			readyState: mongoose.connection.readyState,
			usingVault: Boolean(config.vault),
			...getDeploymentIdentity()
		});
	});

	app.use("/quotes", publicReadRateLimit, createQuoteProxy(config));
	app.use("/tutors", tutorRoutes);
	app.use("/users", userRoutes);
	app.use("/admins", adminRoutes);
	app.use("/accounts", accountRoutes);

	app.use((_req, res) => {
		res.status(404).json({ error: "not_found", message: "Route not found." });
	});
	app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
		if (typeof error === "object" && error !== null && "status" in error) {
			const status = (error as { status?: unknown }).status;
			if (status === 400 || status === 413) {
				return res.status(status).json({
					error: status === 413 ? "payload_too_large" : "invalid_json",
					message: status === 413 ? "The request body is too large." : "The JSON request body is invalid."
				});
			}
		}
		if (error instanceof HttpError) {
			return res.status(error.status).json({ error: error.code, message: error.message });
		}
		if (isDuplicateKeyError(error)) {
			return res.status(409).json({
				error: "conflict",
				message: "The requested value is already in use."
			});
		}
		console.error("Unhandled request error", {
			requestId: req.requestId,
			error: safeErrorSummary(error)
		});
		return res.status(500).json({
			error: "internal_error",
			message: "The request could not be completed."
		});
	});

	return app;
}
