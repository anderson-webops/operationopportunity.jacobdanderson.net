import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const originalHash = "0ce2bb6f196b1a307f2e20944fdd40a3078ff65f6129b48457465be227118cf2";
const patchedHash = "501fe05e4a84995968baed090f76fd033ef291f4552c3b6dbb722c49f70d5cc5";
const originalImport = 'import expand from "brace-expansion";';
const patchedImport = 'import { expand } from "brace-expansion";';

function digest(content) {
	return createHash("sha256").update(content).digest("hex");
}

export function patchLayoutsSource(source) {
	if (digest(source) === patchedHash) return source;
	assert.equal(digest(source), originalHash, "Unexpected vite-plugin-vue-layouts-next source");
	assert.ok(source.includes(originalImport), "Expected brace-expansion import is absent");
	const patched = source.replace(originalImport, patchedImport);
	assert.equal(digest(patched), patchedHash, "Unexpected patched layouts source");
	return patched;
}

async function exists(path) {
	try {
		await access(path);
		return true;
	} catch (error) {
		if (error.code === "ENOENT") return false;
		throw error;
	}
}

export async function patchInstalledLayouts(root = repositoryRoot) {
	const lock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
	assert.equal(lock.packages["node_modules/brace-expansion"]?.version, "5.0.12");

	let patchedCount = 0;
	for (const modulesRoot of [join(root, "node_modules"), join(root, "front-end", "node_modules")]) {
		const packageRoot = join(modulesRoot, "vite-plugin-vue-layouts-next");
		const manifestPath = join(packageRoot, "package.json");
		if (!(await exists(manifestPath))) continue;
		const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
		assert.equal(manifest.version, "3.3.1", "Unexpected vite-plugin-vue-layouts-next version");
		const sourcePath = join(packageRoot, "dist", "index.mjs");
		const source = await readFile(sourcePath, "utf8");
		const patched = patchLayoutsSource(source);
		if (patched !== source) await writeFile(sourcePath, patched);
		patchedCount += 1;
	}

	if (patchedCount === 0 && !process.env.npm_config_omit?.split(",").includes("dev")) {
		throw new Error("vite-plugin-vue-layouts-next is missing from the full installation");
	}
	return patchedCount;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await patchInstalledLayouts();
}
