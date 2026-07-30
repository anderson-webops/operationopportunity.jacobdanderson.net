import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import rootPackage from "../package.json" with { type: "json" };

const commitCandidate = (
	process.env.OPPORTUNITY_COMMIT_SHA
	|| process.env.COMMIT_REF
	|| process.env.SOURCE_REVISION
	|| ""
).trim();
const deployedAtCandidate = (process.env.OPPORTUNITY_DEPLOYED_AT || "").trim();
const commit = /^[0-9a-f]{7,64}$/i.test(commitCandidate) ? commitCandidate : null;
const deployedAt = (
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(deployedAtCandidate)
		? deployedAtCandidate
		: commit && process.env.NETLIFY === "true"
			? new Date().toISOString()
			: null
);
const output = resolve(import.meta.dirname, "../front-end/dist/release.json");

await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, `${JSON.stringify({
	release: `v${rootPackage.version}`,
	commit,
	deployedAt
})}\n`, { encoding: "utf8", mode: 0o644 });
