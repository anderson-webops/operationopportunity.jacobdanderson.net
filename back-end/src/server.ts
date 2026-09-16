import process from "node:process";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { loadConfig, validateResolvedMongoUri } from "./config.js";
import { DATABASE_OPTIONS } from "./databaseCapacity.js";
import { safeErrorSummary } from "./errors.js";
import { RequestCapacity } from "./runtimeCapacity.js";
import { createService } from "./serviceLifecycle.js";
import { serviceLog } from "./serviceLog.js";
import { ensureIdentityRegistry } from "./services/identityRegistry.js";
import { applyAdditiveSecurityMigrations } from "./services/securityMigration.js";
import { readMongoSecret } from "./vaultClient.js";

async function main() {
	const config = loadConfig();
	const capacity = new RequestCapacity(64, () => serviceLog.ready);
	let sessionStore: MongoStore | undefined;
	const service = createService({
		host: config.host,
		port: config.port,
		capacity,
		log: serviceLog,
		initialize: async () => {
			const mongoUri = config.vault ? await readMongoSecret(config.vault) : config.mongoUri;
			if (!mongoUri) throw new Error("MONGODB_URI or a complete Vault configuration is required");
			validateResolvedMongoUri(mongoUri, config);
			await mongoose.connect(mongoUri, DATABASE_OPTIONS);
			await applyAdditiveSecurityMigrations();
			await ensureIdentityRegistry();
			sessionStore = MongoStore.create({
				client: mongoose.connection.getClient(),
				collectionName: "sessions",
				ttl: Math.ceil(config.sessionRememberMaxAgeMs / 1000),
				autoRemove: "native",
				touchAfter: 60
			});
			sessionStore.on("error", (error) => {
				serviceLog.write({
					level: "error",
					message: "Session storage unavailable",
					error: safeErrorSummary(error)
				});
			});
			await sessionStore.collectionP;
			return createApp(config, sessionStore, { capacity });
		},
		dispose: async () => {
			try {
				await sessionStore?.close();
			} finally {
				if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
			}
		}
	});

	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		// Keep the listener through draining: a second signal must not interrupt writes.
		process.on(signal, () => {
			void service.shutdown(signal).then((code) => process.exit(code));
		});
	}
	await service.start().catch(async (error) => {
		serviceLog.write({
			level: "error",
			message: "Operation Opportunity API failed to start",
			error: safeErrorSummary(error)
		});
		await service.shutdown("startup-error");
		process.exit(1);
	});
}

void main().catch((error) => {
	serviceLog.write({
		level: "error",
		message: "Operation Opportunity configuration failed",
		error: safeErrorSummary(error)
	});
	process.exit(1);
});
