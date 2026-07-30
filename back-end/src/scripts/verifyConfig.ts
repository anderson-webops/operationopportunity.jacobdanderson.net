import { loadConfig } from "../config.js";

const config = loadConfig();
console.log(
	JSON.stringify({
		environment: config.environment,
		host: config.host,
		port: config.port,
		publicOrigin: config.publicOrigin,
		trustedProxyCount: config.trustedProxyIps.length,
		sessionSecretCount: config.sessionSecrets.length,
		mongoSource: config.vault ? "vault" : config.mongoUri ? "environment" : "missing",
		diagnosticsEnabled: config.enableInternalDiagnostics,
		quotesSocketEnabled: Boolean(config.quotesUpstreamSocketPath)
	})
);
