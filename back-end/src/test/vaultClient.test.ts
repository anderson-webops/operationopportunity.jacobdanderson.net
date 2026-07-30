import type { RequestListener } from "node:http";
import type { VaultConfig } from "../config.js";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import { describe, it } from "node:test";
import { readMongoSecret } from "../vaultClient.js";

async function withVaultServer(handler: RequestListener, run: (address: URL) => Promise<void>) {
	const server = createServer(handler);
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	try {
		const address = server.address();
		assert.ok(address && typeof address === "object");
		await run(new URL(`http://127.0.0.1:${address.port}`));
	} finally {
		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	}
}

function vaultConfig(address: URL): VaultConfig {
	return {
		address,
		roleId: "role-id",
		secretId: "secret-id",
		secretPath: "secret/data/opportunity/mongodb"
	};
}

describe("Vault client boundary", () => {
	it("refuses redirects so AppRole credentials cannot be forwarded", async () => {
		let redirectedRequestReachedDestination = false;
		await withVaultServer(
			(req, res) => {
				if (req.url === "/capture") redirectedRequestReachedDestination = true;
				res.writeHead(307, { location: "/capture" });
				res.end();
			},
			async (address) => {
				await assert.rejects(() => readMongoSecret(vaultConfig(address)));
			}
		);
		assert.equal(redirectedRequestReachedDestination, false);
	});

	it("rejects an oversized Vault response before buffering it", async () => {
		await withVaultServer(
			(_req, res) => {
				const body = Buffer.alloc(65 * 1024, 0x20);
				res.writeHead(200, {
					"content-length": String(body.length),
					"content-type": "application/json"
				});
				res.end(body);
			},
			async (address) => {
				await assert.rejects(() => readMongoSecret(vaultConfig(address)), /exceeds the configured limit/);
			}
		);
	});
});
