import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function assertReadyProbe(payload) {
	assert.deepEqual(payload, { ok: true }, "Probe must return only {ok:true}");
}

export function assertDeploymentIdentity(expected, actual) {
	assert.match(expected.release, /^v2\.\d+\.\d+$/, "Expected release must be stable v2 semver");
	assert.match(expected.commit, /^[0-9a-f]{40}$/, "Expected commit must be a full revision");
	assert.match(expected.deployedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/);
	for (const key of ["release", "commit", "deployedAt"]) {
		assert.equal(actual?.[key], expected[key], `API ${key} must match the static release`);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const [mode, first, second] = process.argv.slice(2);
	const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
	if (mode === "probe") assertReadyProbe(readJson(first));
	else if (mode === "identity") assertDeploymentIdentity(readJson(first), readJson(second));
	else throw new Error("Expected probe <response> or identity <expected> <actual>");
}
