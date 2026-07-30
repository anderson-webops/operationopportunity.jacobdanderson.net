import type { Request } from "express";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import { describe, it } from "node:test";
import {
	buildQuotesRequestPath,
	fetchQuotesViaHttp,
	normalizeQuotesPayload,
	resolveQuotesUpstreamUrl
} from "../controllers/common/quoteProxy.js";

describe("quotes proxy boundary", () => {
	it("forwards only bounded, documented query filters", () => {
		const req = {
			query: {
				tags: "success",
				limit: " 10 ",
				random: " sometimes ",
				adminKey: "must-not-forward",
				search: "x".repeat(201),
				author: "   "
			}
		} as unknown as Request;
		assert.equal(buildQuotesRequestPath(req), "/quotes?limit=10&tags=success");
	});

	it("preserves a reviewed upstream base path without duplicating quotes", () => {
		const result = resolveQuotesUpstreamUrl(
			new URL("https://jacobdanderson.net/quotes-api"),
			"/quotes?tags=success"
		);
		assert.equal(result.toString(), "https://jacobdanderson.net/quotes-api/quotes?tags=success");
	});

	it("normalizes and bounds upstream data", () => {
		const quotes = normalizeQuotesPayload({
			quotes: [
				{
					_id: "1",
					body: "A useful quote",
					author: "Author",
					tags: ["one", "x".repeat(150), "", 2]
				}
			]
		});
		assert.equal(quotes.length, 1);
		assert.equal(quotes[0]?.content, "A useful quote");
		assert.deepEqual(quotes[0]?.tags, ["one", "x".repeat(100)]);
	});

	it("stops reading an oversized HTTP response", async () => {
		const server = createServer((_req, res) => {
			const body = Buffer.alloc(1024 * 1024 + 1, 0x20);
			res.writeHead(200, {
				"content-length": String(body.length),
				"content-type": "application/json"
			});
			res.end(body);
		});
		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(0, "127.0.0.1", resolve);
		});
		try {
			const address = server.address();
			assert.ok(address && typeof address === "object");
			await assert.rejects(
				() => fetchQuotesViaHttp(new URL(`http://127.0.0.1:${address.port}/quotes`)),
				/exceeds the configured limit/
			);
		} finally {
			await new Promise<void>((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		}
	});
});
