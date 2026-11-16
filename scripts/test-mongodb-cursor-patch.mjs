import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { cursorPatch, patchInstalledMongoCursor, patchMongoCursorSource } from "./patch-mongodb-cursor.mjs";

test("the reviewed cursor patch is exact, idempotent and isolates hardlinked input", async () => {
	const require = createRequire(import.meta.url);
	const filename = join(dirname(require.resolve("mongodb")), "cursor/abstract_cursor.js");
	const installed = await readFile(filename, "utf8");
	assert.equal(createHash("sha256").update(installed).digest("hex"), cursorPatch.patchedSha256);
	assert.equal(patchMongoCursorSource(installed), installed);
	assert.throws(() => patchMongoCursorSource(`${installed}\n`), /Unexpected MongoDB cursor source/);
	const original = installed
		.replace("    async getMore() {\n        this.signal?.throwIfAborted();\n", "    async getMore() {\n")
		.replace(
			"            batchSize: this.cursorOptions.batchSize,\n            signal: this.signal\n        };",
			"            batchSize: this.cursorOptions.batchSize\n        };"
		);
	assert.equal(createHash("sha256").update(original).digest("hex"), cursorPatch.originalSha256);
	assert.equal(patchMongoCursorSource(original), installed);
	const fixture = await mkdtemp(join(tmpdir(), "mongodb-cursor-patch-"));
	try {
		const modules = join(fixture, "node_modules/mongodb/lib/cursor");
		await mkdir(modules, { recursive: true });
		await writeFile(join(fixture, "package.json"), "{}");
		await writeFile(
			join(fixture, "node_modules/mongodb/package.json"),
			JSON.stringify({ version: cursorPatch.version, main: "lib/index.js" })
		);
		await writeFile(join(fixture, "node_modules/mongodb/lib/index.js"), "module.exports = {};");
		const retained = join(fixture, "retained-input.js");
		await writeFile(retained, original);
		const target = join(modules, "abstract_cursor.js");
		await link(retained, target);
		await patchInstalledMongoCursor(fixture);
		await patchInstalledMongoCursor(fixture);
		assert.equal(await readFile(retained, "utf8"), original);
		assert.equal(await readFile(target, "utf8"), installed);
		const shared = join(fixture, "shared-consumer");
		await mkdir(shared);
		await writeFile(join(shared, "package.json"), "{}");
		await symlink(join(fixture, "node_modules"), join(shared, "node_modules"), "dir");
		await patchInstalledMongoCursor(shared);
		await writeFile(target, original);
		await assert.rejects(patchInstalledMongoCursor(shared), /owned directory/);
		assert.equal(await readFile(target, "utf8"), original);
	} finally {
		await rm(fixture, { recursive: true, force: true });
	}
});
