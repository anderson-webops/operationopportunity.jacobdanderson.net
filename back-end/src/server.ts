import process, { exit } from "node:process";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { loadConfig, validateResolvedMongoUri } from "./config.js";
import { safeErrorSummary } from "./errors.js";
import { ensureIdentityRegistry } from "./services/identityRegistry.js";
import { applyAdditiveSecurityMigrations } from "./services/securityMigration.js";
import { readMongoSecret } from "./vaultClient.js";

async function main() {
	const config = loadConfig();
	const mongoUri = config.vault
		? await readMongoSecret(config.vault)
		: config.mongoUri;
	if (!mongoUri) {
		throw new Error("MONGODB_URI or a complete Vault configuration is required");
	}
	validateResolvedMongoUri(mongoUri, config);

	await mongoose.connect(mongoUri, {
		serverSelectionTimeoutMS: 8_000,
		connectTimeoutMS: 8_000,
		maxPoolSize: 20,
		minPoolSize: 0
	});
	await applyAdditiveSecurityMigrations();
	await ensureIdentityRegistry();

	const sessionStore = MongoStore.create({
		client: mongoose.connection.getClient(),
		collectionName: "sessions",
		ttl: Math.ceil(config.sessionRememberMaxAgeMs / 1000),
		autoRemove: "native",
		touchAfter: 60
	});
	const app = createApp(config, sessionStore);
	const server = app.listen(config.port, config.host, () => {
		console.log(JSON.stringify({
			level: "info",
			message: "Operation Opportunity API listening",
			host: config.host,
			port: config.port
		}));
	});
	server.requestTimeout = 15_000;
	server.headersTimeout = 10_000;
	server.keepAliveTimeout = 5_000;
	let isShuttingDown = false;

	const shutdown = async (signal: NodeJS.Signals) => {
		if (isShuttingDown) return;
		isShuttingDown = true;
		console.log(JSON.stringify({ level: "info", message: "Graceful shutdown started", signal }));
		const forceCloseTimer = setTimeout(() => server.closeAllConnections(), 12_000);
		forceCloseTimer.unref();
		try {
			if (server.listening) {
				await new Promise<void>((resolve, reject) => {
					server.close(error => error ? reject(error) : resolve());
				});
			}
			clearTimeout(forceCloseTimer);
			await sessionStore.close();
			if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
			exit(0);
		}
		catch (error) {
			clearTimeout(forceCloseTimer);
			console.error("Graceful shutdown failed", safeErrorSummary(error));
			exit(1);
		}
	};

	process.once("SIGINT", () => void shutdown("SIGINT"));
	process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
	console.error("Operation Opportunity API failed to start", {
		error: safeErrorSummary(error)
	});
	exit(1);
});
