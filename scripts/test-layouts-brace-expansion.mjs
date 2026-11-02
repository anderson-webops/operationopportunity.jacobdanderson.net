import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { expand } from "brace-expansion";
import { patchLayoutsSource } from "./patch-layouts-brace-expansion.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const installedSource = join(repositoryRoot, "node_modules", "vite-plugin-vue-layouts-next", "dist", "index.mjs");

test("layouts uses the verified named brace-expansion export", async () => {
	const source = await readFile(installedSource, "utf8");
	assert.equal(
		createHash("sha256").update(source).digest("hex"),
		"501fe05e4a84995968baed090f76fd033ef291f4552c3b6dbb722c49f70d5cc5"
	);
	assert.equal(patchLayoutsSource(source), source);
	assert.deepEqual(expand("pages/{admin,account}/[id].vue"), ["pages/admin/[id].vue", "pages/account/[id].vue"]);
	assert.deepEqual(expand("pages/{01..03}/index.vue"), [
		"pages/01/index.vue",
		"pages/02/index.vue",
		"pages/03/index.vue"
	]);
	await import("vite-plugin-vue-layouts-next");
});

test("layouts patch rejects unreviewed package bytes", () => {
	assert.throws(
		() => patchLayoutsSource('import expand from "brace-expansion";\n'),
		/Unexpected vite-plugin-vue-layouts-next source/
	);
});
