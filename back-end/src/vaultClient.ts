import type { VaultConfig } from "./config.js";
import { Buffer } from "node:buffer";

const VAULT_TIMEOUT_MS = 5_000;
const MAX_VAULT_RESPONSE_BYTES = 64 * 1024;

async function readBoundedJson(response: Response): Promise<unknown> {
	const declaredLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredLength) && declaredLength > MAX_VAULT_RESPONSE_BYTES) {
		throw new Error("Vault response exceeds the configured limit");
	}
	if (!response.body) throw new Error("Vault returned an empty response");

	const reader = response.body.getReader();
	const chunks: Buffer[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > MAX_VAULT_RESPONSE_BYTES) {
			await reader.cancel();
			throw new Error("Vault response exceeds the configured limit");
		}
		chunks.push(Buffer.from(value));
	}
	try {
		return JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
	} catch {
		throw new Error("Vault returned invalid JSON");
	}
}

async function vaultRequest(config: VaultConfig, path: string, init: RequestInit): Promise<Response> {
	const response = await fetch(new URL(`/v1/${path}`, config.address), {
		...init,
		redirect: "error",
		signal: AbortSignal.timeout(VAULT_TIMEOUT_MS)
	});
	if (!response.ok) {
		throw new Error(`Vault request failed with status ${response.status}`);
	}
	return response;
}

async function vaultLogin(config: VaultConfig): Promise<string> {
	const response = await vaultRequest(config, "auth/approle/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			role_id: config.roleId,
			secret_id: config.secretId
		})
	});
	const data = (await readBoundedJson(response)) as { auth?: { client_token?: unknown } };
	const token = data.auth?.client_token;
	if (typeof token !== "string" || token.length < 16) {
		throw new Error("Vault login returned an invalid token");
	}
	return token;
}

export async function readMongoSecret(config: VaultConfig): Promise<string> {
	const token = await vaultLogin(config);
	const response = await vaultRequest(config, config.secretPath, {
		headers: { "X-Vault-Token": token }
	});
	const data = (await readBoundedJson(response)) as {
		data?: { data?: { uri?: unknown } };
	};
	const uri = data.data?.data?.uri;
	if (typeof uri !== "string" || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
		throw new Error("Vault Mongo secret is missing a valid URI");
	}
	return uri;
}
