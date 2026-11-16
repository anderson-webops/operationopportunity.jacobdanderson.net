import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const vendor = path.join(repository, "vendor/webops-build-tools");

function regularBytes(filename) {
	const result = spawnSync("python3", ["-I", "-B", path.join(repository, "scripts/read-build-input.py"), filename], {
		maxBuffer: 8 * 1024 * 1024 + 32768,
		timeout: 30000
	});
	assert.ifError(result.error);
	assert.equal(result.signal, null, "Build input read was interrupted");
	assert.equal(result.status, 0, result.stderr.toString("utf8"));
	return result.stdout;
}

export function verifyVendoredInputs(directory = vendor) {
	const metadata = JSON.parse(regularBytes(path.join(directory, "CANONICAL.json")));
	assert.equal(metadata.schemaVersion, 1);
	assert.equal(metadata.repository, "anderson-webops/vitesse-nuxt-template");
	assert.match(metadata.commit, /^[a-f0-9]{40}$/);
	const expected = Object.keys(metadata.files).sort((left, right) => left.localeCompare(right));
	const actual = [];
	const pending = [directory];
	while (pending.length) {
		for (const entry of readdirSync(pending.pop(), { withFileTypes: true })) {
			assert.ok(!entry.isSymbolicLink(), "Vendored build inputs must not use links");
			const filename = path.join(entry.parentPath, entry.name);
			if (entry.isDirectory()) {
				pending.push(filename);
			} else {
				assert.ok(entry.isFile(), "Vendored build inputs must be regular");
				const relative = path.relative(directory, filename).split(path.sep).join("/");
				if (relative !== "CANONICAL.json") actual.push(relative);
			}
		}
	}
	assert.deepEqual(
		actual.sort((left, right) => left.localeCompare(right)),
		expected,
		"Unexpected vendored build inputs"
	);
	for (const relative of expected) {
		assert.ok(!path.isAbsolute(relative) && !relative.split("/").includes(".."));
		assert.match(metadata.files[relative], /^[a-f0-9]{64}$/);
		const bytes = regularBytes(path.join(directory, relative));
		assert.equal(
			createHash("sha256").update(bytes).digest("hex"),
			metadata.files[relative],
			`Vendored build input differs: ${relative}`
		);
	}
	return metadata;
}

function run(script, argumentsList, environment) {
	const result = spawnSync(process.execPath, [script, ...argumentsList], {
		cwd: repository,
		env: environment,
		stdio: "inherit",
		timeout: 720_000
	});
	assert.ifError(result.error);
	assert.equal(result.signal, null, "Build tool command was interrupted");
	assert.equal(result.status, 0, "Build tool command failed");
}

async function main() {
	const [mode] = process.argv.slice(2);
	assert.ok(
		process.argv.length === 3 &&
			["--print-bin", "--check", "--audit", "--audit-production", "--audit-signatures"].includes(mode),
		"Choose one supported build-tool operation"
	);
	verifyVendoredInputs();
	const environment = {
		...process.env,
		NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || path.join(repository, ".ai-work/runs/build-toolchain-cache")
	};
	const [cache, state] = await Promise.all([
		import(pathToFileURL(path.join(vendor, "scripts/build-toolchain-cache.mjs"))),
		import(pathToFileURL(path.join(vendor, "scripts/build-toolchain-state.mjs")))
	]);
	const cli = state.selectedNpmCli();
	const prefix = path.resolve(path.dirname(cli), "../../..");
	if (mode === "--print-bin" && !existsSync(path.join(prefix, "acceptance.json"))) {
		run(path.join(vendor, "scripts/build-toolchain.mjs"), ["--print-bin"], environment);
		return;
	}
	const receipt = cache.verifyReusableToolchain(prefix, cache.nodeIdentity());
	const manifest = JSON.parse(readFileSync(path.join(repository, "package.json")));
	const contract = JSON.parse(readFileSync(path.join(repository, "deploy/runtime-artifact.json")));
	assert.equal(receipt.node, readFileSync(path.join(repository, ".node-version"), "utf8").trim());
	assert.equal(receipt.node, readFileSync(path.join(repository, ".nvmrc"), "utf8").trim());
	assert.equal(receipt.node, contract.runtime.node);
	assert.equal(receipt.versions.npm, contract.runtime.npmBuildOnly);
	for (const filename of ["package.json", "front-end/package.json", "back-end/package.json"]) {
		const workspace = JSON.parse(readFileSync(path.join(repository, filename)));
		assert.equal(workspace.engines.node, `>=${receipt.node} <27`);
		assert.equal(workspace.engines.npm, `>=${receipt.versions.npm} <13`);
		assert.equal(workspace.packageManager, `npm@${receipt.versions.npm}`);
	}
	assert.equal(manifest.packageManager, `npm@${receipt.versions.npm}`);
	if (mode === "--print-bin") {
		process.stdout.write(`${path.join(prefix, "bin")}\n`);
	} else if (mode === "--check") {
		process.stdout.write(`${JSON.stringify(receipt)}\n`);
	} else if (mode === "--audit-signatures") {
		run(cli, ["audit", "signatures", "--prefix", prefix, "--workspaces=false"], environment);
	} else {
		run(
			path.join(vendor, "scripts/audit-build-toolchain.mjs"),
			mode === "--audit-production" ? ["--omit=dev"] : [],
			environment
		);
	}
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	await main();
}
