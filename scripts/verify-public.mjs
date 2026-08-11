import { execFileSync } from "node:child_process";
import process from "node:process";
import rootPackage from "../package.json" with { type: "json" };

const origin = new URL(process.argv[2] || "https://operationopportunity.jacobdanderson.net");
if (origin.protocol !== "https:") throw new Error("Public verification requires HTTPS");
const expectedRelease = `v${rootPackage.version}`;
const expectedCommit = (
	process.argv[3] ||
	process.env.EXPECTED_COMMIT ||
	execFileSync("/usr/bin/git", ["rev-parse", "HEAD"], { encoding: "utf8" })
).trim();

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function commitMatches(actual) {
	return (
		typeof actual === "string" &&
		/^[0-9a-f]{7,64}$/i.test(actual) &&
		(actual === expectedCommit || actual.startsWith(expectedCommit) || expectedCommit.startsWith(actual))
	);
}

async function get(path, init = {}) {
	const response = await fetch(new URL(path, origin), {
		...init,
		headers: { accept: "application/json" },
		redirect: "error",
		signal: AbortSignal.timeout(15_000)
	});
	const body = await response.text();
	return {
		response,
		body,
		json: body ? JSON.parse(body) : null
	};
}

const rootResponse = await fetch(origin, { redirect: "error", signal: AbortSignal.timeout(15_000) });
assert(rootResponse.ok, "site root must be reachable");
const staticCsp = rootResponse.headers.get("content-security-policy") || "";
assert(staticCsp.includes("frame-ancestors 'none'"), "site CSP must deny framing");
assert(!/script-src[^;]*'unsafe-(?:inline|eval)'/.test(staticCsp), "site CSP must not allow unsafe scripts");
assert(rootResponse.headers.get("x-content-type-options") === "nosniff", "site must disable MIME sniffing");
assert(rootResponse.headers.get("strict-transport-security")?.includes("max-age="), "site must enforce HSTS");

const staticRelease = await get("/release.json");
assert(staticRelease.response.ok, "static release identity must be reachable");
assert(staticRelease.json.release === expectedRelease, `static release must be ${expectedRelease}`);
assert(commitMatches(staticRelease.json.commit), `static commit must match ${expectedCommit}`);
assert(staticRelease.json.deployedAt, "static deployment timestamp must be present");

const health = await get("/api/healthz");
assert(health.response.ok, "API health check must pass");
assert(JSON.stringify(health.json) === '{"ok":true}', "API health payload must be minimal");
assert(health.response.headers.get("cache-control")?.includes("no-store"), "API health must not be cached");
assert(health.response.headers.get("x-frame-options") === "DENY", "API must deny framing");
for (const header of ["location", "set-cookie", "www-authenticate"]) {
	assert(!health.response.headers.get(header), `API health must not set ${header}`);
}
const healthHead = await get("/api/healthz", { method: "HEAD" });
assert(healthHead.response.ok && healthHead.body === "", "API health HEAD must be bodyless");

const readiness = await get("/api/readyz");
assert(
	readiness.response.ok && JSON.stringify(readiness.json) === '{"ok":true}',
	"API readiness and dependency checks must pass with a minimal payload"
);
const readinessHead = await get("/api/readyz", { method: "HEAD" });
assert(readinessHead.response.ok && readinessHead.body === "", "API readiness HEAD must be bodyless");

const csrf = await get("/api/accounts/csrf");
const sessionCookie = csrf.response.headers.get("set-cookie") || "";
assert(csrf.response.ok && typeof csrf.json.csrfToken === "string", "CSRF bootstrap must succeed");
assert(sessionCookie.startsWith("__Host-operation.sid="), "production session cookie must use the __Host- prefix");
for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) {
	assert(sessionCookie.includes(attribute), `session cookie must include ${attribute}`);
}

const directory = await get("/api/tutors");
assert(directory.response.ok && Array.isArray(directory.json), "public tutor directory must be available");
for (const tutor of directory.json) {
	const keys = Object.keys(tutor).sort();
	assert(
		keys.every((key) => ["_id", "name", "state"].includes(key)),
		"public tutor directory exposed a private field"
	);
}

assert((await get("/api/users/all")).response.status === 401, "user directory must require authentication");
assert((await get("/api/tutors/all")).response.status === 401, "full tutor directory must require authentication");
assert((await get("/api/_dbinfo")).response.status === 404, "database diagnostics must be hidden");

const rejectedAdmin = await fetch(new URL("/api/admins", origin), {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({
		name: "Public verifier",
		email: "public-verifier@example.invalid",
		password: "this-request-must-never-run"
	}),
	redirect: "error",
	signal: AbortSignal.timeout(15_000)
});
assert(rejectedAdmin.status === 403, "mutation without same-origin CSRF state must be rejected");

console.log(
	JSON.stringify({
		origin: origin.origin,
		release: expectedRelease,
		staticCommit: staticRelease.json.commit,
		publicTutorCount: directory.json.length
	})
);
