import { exit } from "node:process";
import mongoose from "mongoose";
import * as readlineSync from "readline-sync";
import { loadConfig, validateResolvedMongoUri } from "./config.js";
import { Admin } from "./models/schemas/Admin.js";
import { withAdminWorkflowLock } from "./services/adminWorkflow.js";
import { ensureIdentityRegistry } from "./services/identityRegistry.js";
import { applyAdditiveSecurityMigrations } from "./services/securityMigration.js";
import { normalizeEmail } from "./validation.js";
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

	await withAdminWorkflowLock(async () => {
		if (await Admin.countDocuments({ editAdmins: true }) > 0) {
			throw new Error("Recovery grant refused: an admin manager already exists");
		}
		const email = normalizeEmail(readlineSync.questionEMail("Existing admin email: "));
		const admin = await Admin.findOne({ email }).exec();
		if (!admin) throw new Error("Admin account not found");
		admin.editAdmins = true;
		admin.authVersion += 1;
		await admin.save();
		console.log(JSON.stringify({
			level: "warning",
			event: "admin.manager_recovery_grant",
			status: "success",
			targetId: admin._id.toString()
		}));
	});
}

main()
	.then(async () => {
		await mongoose.disconnect();
		exit(0);
	})
	.catch(async (error) => {
		console.error(error instanceof Error ? error.message : "Admin manager recovery failed");
		if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
		exit(1);
	});
