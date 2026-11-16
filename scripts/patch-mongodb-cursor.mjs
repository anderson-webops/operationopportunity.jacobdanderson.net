import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
export const cursorPatch = JSON.parse(
	await readFile(new URL("../back-end/mongodb-cursor-patch.json", import.meta.url), "utf8")
);
const digest = (source) => createHash("sha256").update(source).digest("hex");

export function patchMongoCursorSource(source) {
	if (digest(source) === cursorPatch.patchedSha256) return source;
	assert.equal(digest(source), cursorPatch.originalSha256, "Unexpected MongoDB cursor source");
	const patched = source
		.replace("    async getMore() {\n", "    async getMore() {\n        this.signal?.throwIfAborted();\n")
		.replace(
			"            batchSize: this.cursorOptions.batchSize\n        };",
			"            batchSize: this.cursorOptions.batchSize,\n            signal: this.signal\n        };"
		);
	assert.equal(digest(patched), cursorPatch.patchedSha256, "Unexpected MongoDB cursor patch");
	return patched;
}

export async function patchInstalledMongoCursor(root = repository) {
	root = await realpath(root);
	const modules = join(root, "node_modules");
	const modulesState = await lstat(modules);
	const require = createRequire(join(root, "package.json"));
	assert.equal(require("mongodb/package.json").version, cursorPatch.version, "Unreviewed MongoDB version");
	const filename = await realpath(join(dirname(require.resolve("mongodb")), "cursor/abstract_cursor.js"));
	const child = relative(await realpath(modules), filename);
	assert.ok(child && !isAbsolute(child) && !child.startsWith(".."), "MongoDB must resolve inside this installation");
	const before = await lstat(filename);
	assert.ok(before.isFile());
	const source = await readFile(filename, "utf8");
	const patched = patchMongoCursorSource(source);
	if (patched !== source) {
		assert.ok(modulesState.isDirectory(), "The installation root must be an owned directory");
		const temporary = `${filename}.patch-${randomUUID()}`;
		let created = false;
		try {
			await writeFile(temporary, patched, { flag: "wx", mode: before.mode & 0o755 });
			created = true;
			const current = await lstat(filename);
			assert.equal(current.dev, before.dev);
			assert.equal(current.ino, before.ino);
			assert.equal(await readFile(filename, "utf8"), source, "MongoDB changed during patching");
			await rename(temporary, filename);
		} finally {
			if (created) await rm(temporary, { force: true });
		}
	}
	assert.equal(digest(await readFile(filename)), cursorPatch.patchedSha256);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	assert.ok(process.argv.length <= 3);
	await patchInstalledMongoCursor(process.argv[2] ?? repository);
}
