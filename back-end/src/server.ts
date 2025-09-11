// src/server.ts
import { env, exit } from "node:process";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import express from "express";
import mongoose from "mongoose";

import { quoteProxy } from "./controllers/common/quoteProxy.js";
import { accountRoutes } from "./routes/accountRoutes.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { tutorRoutes } from "./routes/tutorRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";

import { readMongoSecret } from "./vaultClient.js";

import "dotenv/config";

async function main() {
	const app = express();

	const SESSION_SECRET = env.SESSION_SECRET;
	if (!SESSION_SECRET) throw new Error("Missing SESSION_SECRET");

	app.set("trust proxy", 1);
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());
	app.use(cookieParser());
	app.use(
		cookieSession({
			name: "session",
			keys: [SESSION_SECRET],
			maxAge: 24 * 60 * 60 * 1000,
			sameSite: "lax",
			secure: env.NODE_ENV === "production"
		})
	);

	app.use("/quotes", quoteProxy);

	// --- Get Mongo URI from Vault (preferred), else env fallback ---
	let mongoUri: string | undefined;
	try {
		const { uri } = await readMongoSecret(); // your Vault client should read from KV v2
		mongoUri = uri;
	} catch (e) {
		// Fail silently if Vault is not available, then probably local test (Had to do this to avoid weird requirements
		// console.log("Vault unavailable, falling back to MONGODB_URI:", e);
		const m: string = e?.toString() || "";
		if (!m.includes("Failed to fetch") && !m.includes("connect ECONNREFUSED")) {
			console.log("");
		}

		mongoUri = env.MONGODB_URI;
	}

	if (!mongoUri) {
		throw new Error("No MongoDB URI available (Vault and MONGODB_URI missing)");
	}

	await mongoose.connect(mongoUri);
	console.log("Connected to MongoDB");

	// Your routes (note: you’ve commented an axios baseURL elsewhere; these are mounted as-is)
	app.use("/tutors", tutorRoutes);
	app.use("/users", userRoutes);
	app.use("/admins", adminRoutes);
	app.use("/accounts", accountRoutes);

	// after your session middleware in server.ts
	app.get("/accounts/me", (req, res) => {
		const s = req.session as any;
		res.json({ adminID: s?.adminID ?? null, tutorID: s?.tutorID ?? null, userID: s?.userID ?? null });
	});

	const PORT = env.PORT || 3002;
	app.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));
}

main().catch(err => {
	console.error(err);
	exit(1);
});
