import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import rootPackage from "../package.json" with { type: "json" };

const root = resolve(import.meta.dirname, "..");
function currentGitCommit() {
	try {
		return execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"]
		}).trim();
	} catch {
		return "";
	}
}

const commitCandidate = (
	process.env.OPPORTUNITY_COMMIT_SHA ||
	process.env.COMMIT_REF ||
	process.env.SOURCE_REVISION ||
	currentGitCommit()
).trim();
const deployedAtCandidate = (process.env.OPPORTUNITY_DEPLOYED_AT || new Date().toISOString()).trim();
if (!/^[0-9a-f]{7,64}$/i.test(commitCandidate)) {
	throw new Error("A valid deployment commit is required to build release.json");
}
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(deployedAtCandidate)) {
	throw new Error("A valid UTC deployment timestamp is required to build release.json");
}
const output = resolve(import.meta.dirname, "../front-end/dist/release.json");

await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(
	output,
	`${JSON.stringify({
		release: `v${rootPackage.version}`,
		commit: commitCandidate,
		deployedAt: deployedAtCandidate
	})}\n`,
	{ encoding: "utf8", mode: 0o644 }
);
