import type { Request } from "express";
import type { RequestListener, Server } from "node:http";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, get } from "node:http";
import { describe, it } from "node:test";
import express from "express";
import request from "supertest";
import {
	buildQuotesRequestPath,
	createQuoteProxy,
	fetchQuotesViaHttp,
	fetchQuotesViaSocket,
	normalizeQuotesPayload,
	resolveQuotesUpstreamUrl
} from "../controllers/common/quoteProxy.js";

describe("quotes proxy boundary", () => {
	it("forwards only bounded, documented query filters", () => {
		const req = {
			query: {
				tags: "success",
				limit: " 10 ",
				random: " true ",
				adminKey: "must-not-forward",
				search: " effort ",
				author: "   "
			}
		} as unknown as Request;
		assert.equal(buildQuotesRequestPath(req), "/quotes?limit=10&random=true&search=effort&tags=success");
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

async function listen(server: Server, socketPath?: string): Promise<string> {
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		if (socketPath) server.listen(socketPath, resolve);
		else server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	return typeof address === "string" ? address : `http://127.0.0.1:${address!.port}`;
}

async function close(server: Server) {
	server.closeAllConnections();
	await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

const validQuotes = [{ _id: "q1", content: "Make a start.", author: "Author", tags: ["success"] }];

async function withUpstreams(
	socketHandler: RequestListener | undefined,
	httpHandler: RequestListener,
	run: (app: express.Express) => Promise<void>
) {
	const directory = await mkdtemp("/tmp/oq-");
	const socket = createServer(socketHandler);
	const http = createServer(httpHandler);
	try {
		const url = await listen(http);
		if (socketHandler) await listen(socket, `${directory}/quotes.sock`);
		const app = express().use(
			"/quotes",
			createQuoteProxy({
				quotesUpstreamSocketPath: `${directory}/quotes.sock`,
				quotesUpstreamUrl: new URL(`${url}/quotes-api`)
			})
		);
		await run(app);
	} finally {
		if (socket.listening) await close(socket);
		if (http.listening) await close(http);
		await rm(directory, { recursive: true, force: true });
	}
}

describe("quotes transport and route integration", () => {
	it("prefers the socket and forwards the exact random query without credentials", async () => {
		let httpCalls = 0;
		await withUpstreams(
			(req, res) => {
				assert.equal(req.url, "/quotes?limit=1&random=true&tags=success");
				assert.equal(req.headers.cookie, undefined);
				assert.equal(req.headers.authorization, undefined);
				res.end(JSON.stringify(validQuotes));
			},
			(_req, res) => {
				httpCalls++;
				res.end("[]");
			},
			async (app) => {
				const response = await request(app)
					.get("/quotes?tags=success&random=true&limit=1&adminKey=ignored")
					.set("Cookie", "session=private")
					.set("Authorization", "Bearer private")
					.expect(200);
				assert.equal(response.body[0].content, "Make a start.");
				assert.equal(response.headers["cache-control"], "no-store");
				assert.equal(httpCalls, 0);
			}
		);
	});

	for (const failure of ["missing socket", "503", "malformed JSON", "invalid data"]) {
		it(`uses HTTP fallback for ${failure}`, async () => {
			let httpCalls = 0;
			await withUpstreams(
				failure === "missing socket"
					? undefined
					: (_req, res) => {
							res.statusCode = failure === "503" ? 503 : 200;
							res.end(
								failure === "malformed JSON"
									? "{broken"
									: JSON.stringify({ error: "private upstream detail" })
							);
						},
				(req, res) => {
					httpCalls++;
					assert.equal(req.url, "/quotes-api/quotes?limit=1&random=true&tags=success");
					res.end(JSON.stringify(validQuotes));
				},
				async (app) => {
					const response = await request(app).get("/quotes?limit=1&random=true&tags=success").expect(200);
					assert.equal(response.body[0].content, "Make a start.");
					assert.equal(httpCalls, 1);
				}
			);
		});
	}

	it("preserves an empty filter result without retrying", async () => {
		let httpCalls = 0;
		await withUpstreams(
			(_req, res) => res.end("[]"),
			(_req, res) => {
				httpCalls++;
				res.end("[]");
			},
			async (app) => {
				const response = await request(app).get("/quotes?search=absent").expect(200);
				assert.deepEqual(response.body, []);
				assert.equal(httpCalls, 0);
			}
		);
	});

	for (const status of [400, 429]) {
		it(`preserves upstream ${status} without retrying or leaking details`, async () => {
			let httpCalls = 0;
			await withUpstreams(
				(_req, res) => {
					// Even a broken/oversized error body must not bypass the upstream rejection.
					res.writeHead(status, { "Retry-After": "30", "Content-Length": "2000000" });
					res.end(JSON.stringify({ error: "private details" }));
				},
				(_req, res) => {
					httpCalls++;
					res.end("[]");
				},
				async (app) => {
					const response = await request(app).get("/quotes").expect(status);
					assert.deepEqual(response.body, {
						error: status === 400 ? "invalid_quote_query" : "quotes_rate_limited"
					});
					assert.equal(response.headers["retry-after"], status === 429 ? "30" : undefined);
					assert.equal(httpCalls, 0);
				}
			);
		});
	}

	it("rejects invalid filters before contacting upstream", async () => {
		let upstreamCalls = 0;
		const handler: RequestListener = (_req, res) => {
			upstreamCalls++;
			res.end("[]");
		};
		await withUpstreams(handler, handler, async (app) => {
			for (const query of [
				"limit=101",
				"limit=0",
				"limit=1&limit=2",
				"random=sometimes",
				"author=%0A",
				`search=${"x".repeat(201)}`,
				`tags=${"x".repeat(51)}`
			]) {
				await request(app).get(`/quotes?${query}`).expect(400);
			}
			assert.equal(upstreamCalls, 0);
		});
	});

	it("returns a bounded generic failure when both transports fail", async () => {
		await withUpstreams(
			undefined,
			(_req, res) => res.end("secret invalid JSON"),
			async (app) => {
				const response = await request(app).get("/quotes").expect(502);
				assert.deepEqual(response.body, { error: "quotes_unavailable" });
			}
		);
	});

	it("overrides base query defaults without producing duplicate filters", () => {
		const result = resolveQuotesUpstreamUrl(
			new URL("https://example.test/quotes-api/quotes/?limit=20&random=false"),
			"/quotes?limit=1&random=true"
		);
		assert.equal(result.toString(), "https://example.test/quotes-api/quotes?limit=1&random=true");
	});

	it("bounds a continuously streaming socket request by elapsed time", { timeout: 5000 }, async () => {
		const directory = await mkdtemp("/tmp/oq-");
		const server = createServer((_req, res) => {
			res.writeHead(200);
			const interval = setInterval(() => res.write(" "), 20);
			res.on("close", () => clearInterval(interval));
		});
		try {
			await listen(server, `${directory}/quotes.sock`);
			const start = Date.now();
			await assert.rejects(fetchQuotesViaSocket("/quotes", `${directory}/quotes.sock`), { name: "AbortError" });
			assert.ok(Date.now() - start < 4000);
		} finally {
			await close(server);
			await rm(directory, { recursive: true, force: true });
		}
	});

	it("cancels upstream work when the browser disconnects", async () => {
		let began!: () => void;
		let ended!: () => void;
		const started = new Promise<void>((resolve) => {
			began = resolve;
		});
		const stopped = new Promise<void>((resolve) => {
			ended = resolve;
		});
		let httpCalls = 0;
		await withUpstreams(
			(_req, res) => {
				res.on("close", ended);
				began();
			},
			(_req, res) => {
				httpCalls++;
				res.end("[]");
			},
			async (app) => {
				const server = createServer(app);
				try {
					const url = await listen(server);
					const client = get(`${url}/quotes`);
					client.on("error", () => {});
					await started;
					client.destroy();
					await stopped;
					assert.equal(httpCalls, 0);
				} finally {
					await close(server);
				}
			}
		);
	});

	it("bounds chunked HTTP responses without trusting Content-Length", async () => {
		const server = createServer((_req, res) => {
			res.writeHead(200);
			res.write(Buffer.alloc(600_000, 0x20));
			res.end(Buffer.alloc(600_000, 0x20));
		});
		try {
			const url = await listen(server);
			await assert.rejects(fetchQuotesViaHttp(new URL(url)), /exceeds the configured limit/);
		} finally {
			await close(server);
		}
	});

	it("cancels an HTTP response body on caller abort", async () => {
		let started!: () => void;
		const responseStarted = new Promise<void>((resolve) => {
			started = resolve;
		});
		const server = createServer((_req, res) => {
			res.writeHead(200);
			res.write("[");
			started();
		});
		try {
			const url = await listen(server);
			const controller = new AbortController();
			const pending = fetchQuotesViaHttp(new URL(url), controller.signal);
			const rejected = assert.rejects(pending, { name: "AbortError" });
			await responseStarted;
			controller.abort();
			await rejected;
		} finally {
			await close(server);
		}
	});

	it("stops reading an oversized socket response", async () => {
		const directory = await mkdtemp("/tmp/oq-");
		const server = createServer((_req, res) => res.end(Buffer.alloc(1024 * 1024 + 1, 0x20)));
		try {
			await listen(server, `${directory}/quotes.sock`);
			await assert.rejects(
				fetchQuotesViaSocket("/quotes", `${directory}/quotes.sock`),
				/exceeds the configured limit/
			);
		} finally {
			await close(server);
			await rm(directory, { recursive: true, force: true });
		}
	});

	it("does not follow HTTP redirects", async () => {
		let requests = 0;
		const server = createServer((_req, res) => {
			requests++;
			res.writeHead(302, { location: "/elsewhere" });
			res.end();
		});
		try {
			const url = await listen(server);
			await assert.rejects(fetchQuotesViaHttp(new URL(url)));
			assert.equal(requests, 1);
		} finally {
			await close(server);
		}
	});
});
