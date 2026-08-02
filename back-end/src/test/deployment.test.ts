import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../app.js";
import { RELEASE_VERSION } from "../release.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));

async function text(path: string): Promise<string> {
	return readFile(new URL(path, new URL(`file://${root}/`)), "utf8");
}

describe("deployment invariants", () => {
	it("aligns package and source release identities", async () => {
		const packages = await Promise.all([
			text("package.json"),
			text("back-end/package.json"),
			text("front-end/package.json")
		]);
		for (const source of packages) {
			assert.equal(`v${(JSON.parse(source) as { version: string }).version}`, RELEASE_VERSION);
		}
	});

	it("keeps Linux ARM64 native bindings in the authoritative lockfile", async () => {
		const lock = JSON.parse(await text("package-lock.json")) as {
			packages: Record<
				string,
				{
					version?: string;
					cpu?: string[];
					os?: string[];
					optional?: boolean;
				}
			>;
		};
		const bindingBySource = new Map([
			["oxc-parser", "@oxc-parser/binding-linux-arm64-gnu"],
			["rolldown", "@rolldown/binding-linux-arm64-gnu"],
			["rollup", "@rollup/rollup-linux-arm64-gnu"],
			["lightningcss", "lightningcss-linux-arm64-gnu"]
		]);
		const containerBindingsBySource = new Map<string, ReadonlyArray<readonly [string, string]>>([
			[
				"oxc-parser",
				[
					["@oxc-parser/binding-linux-arm64-musl", "arm64"],
					["@oxc-parser/binding-linux-x64-musl", "x64"]
				]
			],
			[
				"rolldown",
				[
					["@rolldown/binding-linux-arm64-musl", "arm64"],
					["@rolldown/binding-linux-x64-musl", "x64"]
				]
			],
			[
				"rollup",
				[
					["@rollup/rollup-linux-arm64-musl", "arm64"],
					["@rollup/rollup-linux-x64-musl", "x64"]
				]
			],
			[
				"lightningcss",
				[
					["lightningcss-linux-arm64-musl", "arm64"],
					["lightningcss-linux-x64-musl", "x64"]
				]
			]
		]);
		for (const [sourceName, bindingName] of bindingBySource) {
			const suffix = `node_modules/${sourceName}`;
			const sources = Object.entries(lock.packages).filter(
				([path]) => path === suffix || path.endsWith(`/${suffix}`)
			);
			assert.ok(sources.length > 0, `${sourceName} must be locked`);
			for (const [sourcePath, source] of sources) {
				const prefix = sourcePath.slice(0, -suffix.length);
				const binding = lock.packages[`${prefix}node_modules/${bindingName}`];
				assert.ok(binding, `${bindingName} must be locked beside ${sourcePath}`);
				assert.equal(binding.version, source.version, `${bindingName} must match ${sourceName}`);
				assert.deepEqual(binding.cpu, ["arm64"]);
				assert.deepEqual(binding.os, ["linux"]);
				assert.equal(binding.optional, true);
				for (const [containerBindingName, cpu] of containerBindingsBySource.get(sourceName) ?? []) {
					const containerBinding = lock.packages[`${prefix}node_modules/${containerBindingName}`];
					assert.ok(containerBinding, `${containerBindingName} must be locked beside ${sourcePath}`);
					assert.equal(containerBinding.version, source.version);
					assert.deepEqual(containerBinding.cpu, [cpu]);
					assert.deepEqual(containerBinding.os, ["linux"]);
					assert.equal(containerBinding.optional, true);
				}
			}
		}

		const frontend = JSON.parse(await text("front-end/package.json")) as {
			optionalDependencies?: Record<string, string>;
		};
		for (const packageName of bindingBySource.values()) {
			const topLevelBinding = lock.packages[`node_modules/${packageName}`];
			assert.equal(
				frontend.optionalDependencies?.[packageName],
				topLevelBinding?.version,
				`${packageName} must be an exact direct optional dependency`
			);
		}
	});

	it("keeps the standalone API production lock and lifecycle policy reproducible", async () => {
		const [rootLockSource, apiLockSource, apiPackageSource, npmConfig] = await Promise.all([
			text("package-lock.json"),
			text("back-end/package-lock.json"),
			text("back-end/package.json"),
			text("back-end/.npmrc")
		]);
		const rootLock = JSON.parse(rootLockSource) as {
			packages: Record<string, { version?: string }>;
		};
		const apiLock = JSON.parse(apiLockSource) as {
			packages: Record<string, { version?: string }>;
		};
		const apiPackage = JSON.parse(apiPackageSource) as {
			dependencies: Record<string, string>;
		};

		for (const packageName of Object.keys(apiPackage.dependencies)) {
			assert.equal(
				apiLock.packages[`node_modules/${packageName}`]?.version,
				rootLock.packages[`node_modules/${packageName}`]?.version,
				`${packageName} must resolve identically in root and standalone API locks`
			);
		}
		assert.match(npmConfig, /^include=optional$/m);
		assert.match(npmConfig, /^strict-allow-scripts=true$/m);
		for (const allowed of ["argon2@0.45.1", "esbuild@0.28.1", "fsevents@2.3.3"]) {
			assert.ok(
				npmConfig
					.match(/^allow-scripts=(.+)$/m)?.[1]
					.split(",")
					.includes(allowed),
				`${allowed} must be explicitly reviewed for standalone npm installs`
			);
		}
	});

	it("pins container and GitHub Action supply-chain inputs", async () => {
		const dockerfile = await text("Dockerfile");
		assert.match(dockerfile, /FROM node:24\.18\.1-alpine3\.24@sha256:[0-9a-f]{64}/);
		assert.match(dockerfile, /FROM nginxinc\/nginx-unprivileged:stable-alpine@sha256:[0-9a-f]{64}/);
		assert.match(dockerfile, /^USER 101$/m);
		assert.match(dockerfile, /\\d\{4\}-\\d\{2\}-\\d\{2\}T/);
		assert.match(dockerfile, /"\$SOURCE_REVISION" "\$OPPORTUNITY_DEPLOYED_AT"/);

		const ciWorkflow = await text(".github/workflows/ci.yml");
		assert.match(ciWorkflow, /image: mongo:8\.0\.28@sha256:[0-9a-f]{64}/);
		for (const workflow of [
			".github/workflows/ci.yml",
			".github/workflows/codeql-analysis.yml",
			".github/workflows/qodana_code_quality.yml"
		]) {
			const source = await text(workflow);
			for (const line of source.split("\n").filter((line) => line.includes("uses:"))) {
				assert.match(line, /@[0-9a-f]{40}(?:\s|$)/, `${workflow}: ${line.trim()}`);
			}
		}
	});

	it("keeps proxy identity and API routes fail closed", async () => {
		const nginx = await text("deploy/nginx/operation-opportunity-api.location.conf");
		assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3002\//);
		assert.match(nginx, /proxy_set_header X-Forwarded-For \$remote_addr/);
		assert.doesNotMatch(nginx, /\$http_x_forwarded_for/);
		assert.match(nginx, /proxy_set_header X-Internal-Diagnostics-Key ""/);
		assert.match(nginx, /client_max_body_size 64k/);
		assert.match(nginx, /location = \/api\/_dbinfo \{\s*return 404;/);

		const adminRoutes = await text("back-end/src/routes/adminRoutes.ts");
		assert.match(adminRoutes, /validAdminManager, createAdmin/);
		const accountRoutes = await text("back-end/src/routes/accountRoutes.ts");
		assert.match(
			accountRoutes,
			/loginRateLimit,\s*loginAccountRateLimit,\s*login/,
			"Login attempts must be bounded by both source IP and normalized account."
		);
		const userRoutes = await text("back-end/src/routes/userRoutes.ts");
		assert.doesNotMatch(userRoutes, /deleteUsersUnderTutor|\/under\//);
	});

	it("ships a strict host static-edge policy beside the API boundary", async () => {
		const staticEdge = await text("deploy/nginx/operation-opportunity-static.locations.conf");
		assert.match(staticEdge, /location = \/release\.json/);
		assert.match(staticEdge, /location \^~ \/assets\//);
		assert.match(staticEdge, /location \/ \{/);
		assert.match(staticEdge, /try_files \$uri \$uri\/ \/index\.html/);
		assert.equal(
			staticEdge.match(/add_header X-Frame-Options "DENY" always;/g)?.length,
			4,
			"Every host static location must deny framing."
		);
		assert.equal(
			staticEdge.match(/frame-ancestors 'none'/g)?.length,
			4,
			"Every host static location must carry the reviewed CSP."
		);
		assert.doesNotMatch(staticEdge, /unsafe-inline|unsafe-eval/);
	});

	it("enforces a no-inline static content security policy", async () => {
		const [nginx, nginxHeaders, netlify, staticEdge] = await Promise.all([
			text("nginx/default.conf"),
			text("nginx/security-headers.conf"),
			text("netlify.toml"),
			text("deploy/nginx/operation-opportunity-static.locations.conf")
		]);
		for (const source of [nginxHeaders, netlify, staticEdge]) {
			assert.doesNotMatch(source, /unsafe-inline|unsafe-eval/);
			assert.match(source, /script-src-attr 'none'/);
			assert.match(source, /style-src 'self'/);
			assert.match(source, /style-src-attr 'none'/);
			assert.match(source, /frame-ancestors 'none'/);
		}
		assert.equal(
			nginx.match(/include \/etc\/nginx\/operation-security-headers\.conf;/g)?.length,
			4,
			"Nginx locations with cache headers must repeat inherited security headers."
		);
		assert.match(netlify, /Cross-Origin-Opener-Policy = "same-origin"/);
		assert.match(netlify, /Cross-Origin-Resource-Policy = "same-origin"/);
	});

	it("runs the API as a confined, loopback-only service", async () => {
		const service = await text("deploy/systemd/operation-opportunity-api.service");
		assert.match(service, /User=operation-opportunity/);
		assert.match(service, /NoNewPrivileges=true/);
		assert.match(service, /ProtectSystem=strict/);
		assert.match(service, /CapabilityBoundingSet=\n/);
		assert.match(service, /RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6/);
		assert.match(service, /ExecStartPre=.*verifyConfig\.js/);

		const environment = await text("deploy/systemd/api.env.example");
		assert.match(environment, /HOST=127\.0\.0\.1/);
		assert.match(environment, /PUBLIC_ORIGIN=https:\/\/operationopportunity\.jacobdanderson\.net/);
		assert.match(environment, /TRUSTED_PROXY_IPS=127\.0\.0\.1,::1/);
		assert.match(environment, /SESSION_SECRET=replace-with-at-least-32-random-characters/);
		assert.match(environment, /SESSION_SECRETS_JSON='\["newest-secret","previous-secret"\]'/);
	});

	it("has no legacy client-side identity session or mass-assignment controller", async () => {
		const packageSource = await text("back-end/package.json");
		assert.doesNotMatch(packageSource, /cookie-session/);
		const files = await Promise.all([
			text("back-end/src/controllers/users/adminController.ts"),
			text("back-end/src/controllers/users/tutorController.ts"),
			text("back-end/src/controllers/users/userController.ts")
		]);
		assert.doesNotMatch(files.join("\n"), /Object\.assign\s*\(/);
	});

	it("fails closed without a production session store", () => {
		assert.throws(
			() =>
				createApp({
					environment: "production",
					isProduction: true,
					host: "127.0.0.1",
					port: 3002,
					publicOrigin: "https://operationopportunity.jacobdanderson.net",
					trustedProxyIps: ["127.0.0.1"],
					sessionSecrets: ["s".repeat(48)],
					sessionCookieName: "__Host-operation.sid",
					sessionMaxAgeMs: 60_000,
					sessionRememberMaxAgeMs: 120_000,
					mongoUri: "mongodb://operation:password@127.0.0.1/opportunity",
					allowUnauthenticatedLoopbackMongo: false,
					enableInternalDiagnostics: false,
					quotesUpstreamUrl: new URL("https://jacobdanderson.net/quotes-api"),
					requestBodyLimit: "64kb"
				}),
			/external session store/
		);
	});
});
