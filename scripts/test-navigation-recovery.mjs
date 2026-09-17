import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import http from "node:http";
import { extname, resolve } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import puppeteer from "puppeteer";

// Run against the compiled static frontend. All API data and failures are synthetic.
execFileSync("git", ["check-ignore", "-q", ".ai-work/"]);
const root = resolve("front-end/dist");
const temporary = await mkdtemp(resolve(".ai-work/runs/navigation-recovery-"));
const server = http.createServer(async (request, response) => {
	try {
		const path = decodeURIComponent(new URL(request.url, "http://fixture").pathname);
		if (path.startsWith("/api/")) {
			response.writeHead(401, { "Content-Type": "application/json", "Cache-Control": "no-store" });
			response.end("{}");
			return;
		}
		const file = extname(path) ? resolve(root, `.${path}`) : resolve(root, "index.html");
		assert.ok(file.startsWith(`${root}/`));
		const body = await readFile(file);
		response.setHeader(
			"Content-Type",
			{
				".html": "text/html",
				".js": "text/javascript",
				".css": "text/css",
				".svg": "image/svg+xml",
				".png": "image/png"
			}[extname(file)] || "application/octet-stream"
		);
		response.end(body);
	} catch {
		response.writeHead(404);
		response.end();
	}
});
let browser;
try {
	await new Promise((done, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", done);
	});
	const origin = `http://127.0.0.1:${server.address().port}`;
	browser = await puppeteer.launch({
		executablePath: process.env.CHROME_BIN,
		headless: true,
		userDataDir: temporary,
		args: ["--disable-background-networking"]
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1440, height: 1000 });
	const failures = [];
	page.on("pageerror", (error) => failures.push(String(error)));
	let fail = false;
	let blocked = 0;
	await page.setRequestInterception(true);
	page.on("request", (request) => {
		if (!request.url().startsWith(`${origin}/`) && !request.url().startsWith("data:")) return void request.abort();
		if (fail && request.resourceType() === "script") {
			blocked++;
			return void request.abort();
		}
		void request.continue();
	});
	await page.goto(origin, { waitUntil: "domcontentloaded" });
	await page.waitForSelector('a[href="/about"]', { visible: true });
	fail = true;
	await page.click('a[href="/about"]');
	await delay(3000);
	const afterFailure = await page.evaluate(() => ({
		path: location.pathname,
		progress: !!document.querySelector("#nprogress")
	}));
	assert.ok(blocked > 0, "The lazy page download must actually fail.");
	assert.deepEqual(afterFailure, { path: "/", progress: false });
	fail = false;
	await page.click('a[href="/supportus"]');
	await page.waitForFunction(() => location.pathname === "/supportus");
	await delay(1500);
	const recovered = await page.evaluate(() => ({
		path: location.pathname,
		progress: !!document.querySelector("#nprogress")
	}));
	assert.deepEqual(recovered, { path: "/supportus", progress: false });
	assert.deepEqual(failures, []);
	console.log(JSON.stringify({ passed: true, blocked, afterFailure, recovered }));
} finally {
	await browser?.close();
	server.closeAllConnections();
	await new Promise((done) => server.close(done));
	await rm(temporary, { recursive: true, force: true });
}
