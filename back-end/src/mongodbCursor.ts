import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const patch = JSON.parse(readFileSync(new URL("../mongodb-cursor-patch.json", import.meta.url), "utf8")) as {
	version: string;
	patchedSha256: string;
};

export function verifyMongoCursorCancellation(): void {
	const mongooseRequire = createRequire(require.resolve("mongoose"));
	const sessionRequire = createRequire(require.resolve("connect-mongo"));
	const driver = mongooseRequire.resolve("mongodb");
	if (driver !== require.resolve("mongodb") || driver !== sessionRequire.resolve("mongodb")) {
		throw new Error("MongoDB model and session storage must share the reviewed driver");
	}
	const filename = join(dirname(driver), "cursor/abstract_cursor.js");
	const digest = createHash("sha256").update(readFileSync(filename)).digest("hex");
	if (require("mongodb/package.json").version !== patch.version || digest !== patch.patchedSha256) {
		throw new Error("MongoDB cursor cancellation requires the reviewed runtime patch");
	}
}
