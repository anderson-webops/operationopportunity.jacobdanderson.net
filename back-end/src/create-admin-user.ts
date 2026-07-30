import { exit } from "node:process";
import mongoose from "mongoose";
import * as readlineSync from "readline-sync";
import { loadConfig, validateResolvedMongoUri } from "./config.js";
import { Admin } from "./models/schemas/Admin.js";
import { createAccount } from "./services/accountService.js";
import { withAdminWorkflowLock } from "./services/adminWorkflow.js";
import { ensureIdentityRegistry } from "./services/identityRegistry.js";
import { applyAdditiveSecurityMigrations } from "./services/securityMigration.js";
import { parseAdminCreate } from "./validation.js";
import { readMongoSecret } from "./vaultClient.js";

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

	const input = parseAdminCreate({
		name: readlineSync.question("Name: "),
		email: readlineSync.questionEMail("Email: "),
		password: readlineSync.question("Password (12-128 characters): ", { hideEchoBack: true }),
		editAdmins: true
	});
	const admin = await withAdminWorkflowLock(async () => {
		if ((await Admin.countDocuments()) !== 0) {
			throw new Error("Bootstrap refused: admins already exist; use an authorized admin manager");
		}
		return createAccount("admin", input);
	});
	console.log(
		JSON.stringify({
			level: "info",
			event: "admin.bootstrap",
			status: "success",
			targetId: admin._id.toString()
		})
	);
}

main()
	.then(async () => {
		await mongoose.disconnect();
		exit(0);
	})
	.catch(async (error) => {
		console.error(error instanceof Error ? error.message : "Admin bootstrap failed");
		if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
		exit(1);
	});
