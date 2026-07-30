import { spawnSync } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const tempDirectory = await mkdtemp(join(tmpdir(), "operation-api-production-"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runNpm(arguments_) {
	const result = spawnSync(npmCommand, arguments_, {
		cwd: tempDirectory,
		encoding: "utf8",
		env: process.env,
		maxBuffer: 10 * 1024 * 1024
	});
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	if (result.status !== 0) {
		throw new Error(`npm ${arguments_.join(" ")} failed with exit code ${result.status}`);
	}
}

async function exists(path) {
	try {
		await access(path);
		return true;
	}
	catch {
		return false;
	}
}

try {
	for (const file of ["package.json", "package-lock.json", ".npmrc"]) {
		await copyFile(new URL(`../back-end/${file}`, import.meta.url), join(tempDirectory, file));
	}

	runNpm(["ci", "--omit=dev", "--no-fund", "--no-audit"]);
	runNpm(["audit", "--omit=dev", "--audit-level=high"]);

	const packageSource = JSON.parse(await readFile(join(tempDirectory, "package.json"), "utf8"));
	const requireFromInstall = createRequire(join(tempDirectory, "package.json"));
	const installedModulesRoot = await realpath(join(tempDirectory, "node_modules"));
	const installed = [];
	for (const packageName of Object.keys(packageSource.dependencies)) {
		const resolved = await realpath(requireFromInstall.resolve(packageName));
		const localPath = relative(installedModulesRoot, resolved);
		if (localPath.startsWith("..")) {
			throw new Error(`${packageName} resolved outside the isolated production install`);
		}
		requireFromInstall(packageName);
		installed.push(packageName);
	}

	const argon2 = requireFromInstall("argon2");
	const verificationPhrase = "operation-opportunity-production-binding-check";
	const hash = await argon2.hash(verificationPhrase);
	if (!await argon2.verify(hash, verificationPhrase)) {
		throw new Error("The production Argon2 native binding failed verification");
	}

	const omitted = ["esbuild", "fsevents"];
	for (const packageName of omitted) {
		if (await exists(join(tempDirectory, "node_modules", packageName))) {
			throw new Error(`${packageName} must not be installed in the production-only API tree`);
		}
	}

	console.log(JSON.stringify({
		standaloneApiProductionInstall: "passed",
		installed: installed.sort(),
		nativePasswordBinding: "verified",
		omitted
	}));
}
finally {
	await rm(tempDirectory, { recursive: true, force: true });
}
