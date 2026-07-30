import type { AccountDocument, AccountRole } from "./types/account.js";
import { exit } from "node:process";
import mongoose from "mongoose";
import * as readlineSync from "readline-sync";
import { loadConfig, validateResolvedMongoUri } from "./config.js";
import { Admin } from "./models/schemas/Admin.js";
import { Tutor } from "./models/schemas/Tutor.js";
import { User } from "./models/schemas/User.js";
import { updateAccount } from "./services/accountService.js";
import { ensureIdentityRegistry } from "./services/identityRegistry.js";
import { applyAdditiveSecurityMigrations } from "./services/securityMigration.js";
import { normalizeEmail, parseOperatorPasswordReset } from "./validation.js";
import { readMongoSecret } from "./vaultClient.js";

async function findAccount(role: AccountRole, email: string): Promise<AccountDocument | null> {
	if (role === "admin") return Admin.findOne({ email }).exec();
	if (role === "tutor") return Tutor.findOne({ email }).exec();
	return User.findOne({ email }).exec();
}

function readRole(): AccountRole {
	const role = readlineSync.question("Account role (user, tutor, or admin): ").trim().toLowerCase();
	if (role !== "user" && role !== "tutor" && role !== "admin") {
		throw new Error("Password reset refused: account role is invalid");
	}
	return role;
}

async function main() {
	const config = loadConfig();
	const mongoUri = config.vault ? await readMongoSecret(config.vault) : config.mongoUri;
	if (!mongoUri) throw new Error("A MongoDB secret source is required");
	validateResolvedMongoUri(mongoUri, config);
	await mongoose.connect(mongoUri, {
		serverSelectionTimeoutMS: 8_000,
		connectTimeoutMS: 8_000
	});
	await applyAdditiveSecurityMigrations();
	await ensureIdentityRegistry();

	const role = readRole();
	const email = normalizeEmail(readlineSync.questionEMail("Verified account email: "));
	const account = await findAccount(role, email);
	if (!account) throw new Error("Password reset refused: account not found for that role");

	const password = readlineSync.question("New password (12-128 characters): ", { hideEchoBack: true });
	const confirmation = readlineSync.question("Repeat new password: ", { hideEchoBack: true });
	if (password !== confirmation) throw new Error("Password reset refused: passwords do not match");

	const updated = await updateAccount(
		account,
		role,
		parseOperatorPasswordReset({ password }),
		{ operatorPasswordReset: true }
	);
	console.log(JSON.stringify({
		level: "warning",
		event: "account.password_reset_by_operator",
		status: "success",
		targetRole: role,
		targetId: updated._id.toString(),
		sessionsRevoked: true
	}));
}

main()
	.then(async () => {
		await mongoose.disconnect();
		exit(0);
	})
	.catch(async (error) => {
		console.error(error instanceof Error ? error.message : "Password reset failed");
		if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
		exit(1);
	});
