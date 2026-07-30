import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isAbsolute, relative, resolve } from "node:path";

const workspace = fileURLToPath(new URL("..", import.meta.url));
const targets = process.argv.slice(2);

if (!targets.length) throw new Error("At least one build directory is required");

for (const target of targets) {
	const absolute = resolve(workspace, target);
	const pathFromWorkspace = relative(workspace, absolute);
	if (isAbsolute(pathFromWorkspace)
		|| pathFromWorkspace.startsWith("..")
		|| pathFromWorkspace === ""
		|| !/(^|\/)(dist|dist-test)$/.test(pathFromWorkspace)) {
		throw new Error(`Refusing to remove unsafe build path: ${target}`);
	}
	await rm(absolute, { recursive: true, force: true });
}
