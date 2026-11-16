import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
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

test("patched glob consumers preserve configuration matching", async () => {
	const require = createRequire(import.meta.url);
	const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
	for (const consumer of ["@typescript-eslint/typescript-estree", "editorconfig"]) {
		const consumerRequire = createRequire(require.resolve(consumer));
		const matcher = consumerRequire("minimatch");
		assert.equal(consumerRequire("minimatch/package.json").version, manifest.overrides[consumer].minimatch);
		assert.equal(matcher.minimatch(".config.js", "*.js", { dot: true }), true);
		assert.equal(matcher.minimatch("scripts/check.mjs", "scripts/*.mjs", { dot: true }), true);
		assert.equal(matcher.minimatch("src/index.ts", "scripts/*.mjs", { dot: true }), false);
		const prefix = matcher.escape("/fixture/directory[1](draft)", { windowsPathsNoEscape: true });
		const pattern = new matcher.Minimatch(`${prefix}/**/*.{js,ts}`, { matchBase: true, dot: true });
		assert.equal(pattern.match("/fixture/directory[1](draft)/src/.config.ts"), true);
		assert.equal(pattern.match("/fixture/directory[1](draft)/src/readme.md"), false);
	}
	const editorconfig = require("editorconfig");
	const configuration = [
		{
			name: "/fixture/.editorconfig",
			contents: Buffer.from("root=true\n[**/*.{js,ts}]\nindent_size=2\n[!(package).json]\nindent_size=4\n")
		}
	];
	assert.equal(editorconfig.parseFromFilesSync("/fixture/src/.config.ts", configuration).indent_size, 2);
	assert.equal(editorconfig.parseFromFilesSync("/fixture/settings.json", configuration).indent_size, 4);
	assert.equal(editorconfig.parseFromFilesSync("/fixture/package.json", configuration).indent_size, undefined);
});
