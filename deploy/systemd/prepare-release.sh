#!/usr/bin/env bash
set -euo pipefail

system_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
node_bin_dir="${NODE_BIN_DIR:-/usr/bin}"
if [[ "$node_bin_dir" != /* ]] || [[ ! -x "$node_bin_dir/node" ]] || [[ ! -x "$node_bin_dir/npm" ]]; then
	echo "NODE_BIN_DIR must be an absolute directory containing executable node and npm binaries." >&2
	exit 1
fi
node_bin_dir_real="$(cd -- "$node_bin_dir" && pwd -P)"
PATH="$node_bin_dir_real:$system_path"
export PATH
export PUPPETEER_SKIP_DOWNLOAD=true

release_root="${RELEASE_ROOT:-/srv/operation-opportunity/releases}"

if [[ $# -ne 1 ]]; then
	echo "Usage: prepare-release.sh /srv/operation-opportunity/releases/<release>" >&2
	exit 2
fi
if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
	echo "Prepare releases as the unprivileged operation-opportunity deployment user, not root." >&2
	exit 1
fi

release_root_real="$(cd -- "$release_root" && pwd -P)"
candidate="$(cd -- "$1" && pwd -P)"
case "$candidate/" in
	"$release_root_real/"*) ;;
	*) echo "Candidate must resolve beneath $release_root_real: $candidate" >&2; exit 1 ;;
esac
if [[ "$candidate" == "$release_root_real" ]]; then
	echo "Candidate must be a release checkout beneath, not equal to, $release_root_real." >&2
	exit 1
fi
if [[ ! -f "$candidate/package-lock.json" ]] || ! git -C "$candidate" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
	echo "Candidate must be a complete Git checkout with the committed root lockfile." >&2
	exit 1
fi
if [[ -n "$(git -C "$candidate" status --porcelain)" ]]; then
	echo "Candidate checkout must be clean before preparation." >&2
	exit 1
fi
if [[ "$(node --version)" != "v24.18.1" || "$(npm --version)" != "12.0.2" ]]; then
	echo "Preparation requires Node 24.18.1 and npm 12.0.2." >&2
	exit 1
fi

export OPPORTUNITY_COMMIT_SHA="$(git -C "$candidate" rev-parse HEAD)"
export OPPORTUNITY_DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export SOURCE_REVISION="$OPPORTUNITY_COMMIT_SHA"
unset NODE_ENV

cd -- "$candidate"
npm ci --include=dev --include=optional --strict-allow-scripts
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
npm audit signatures
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:build-security
npm run verify:api-production-install
npm run a11y

node - <<'NODE'
import { copyFileSync, readFileSync } from "node:fs";
import rootPackage from "./package.json" with { type: "json" };

const release = JSON.parse(readFileSync("front-end/dist/release.json", "utf8"));
if (
	release.release !== `v${rootPackage.version}` ||
	release.commit !== process.env.OPPORTUNITY_COMMIT_SHA ||
	release.deployedAt !== process.env.OPPORTUNITY_DEPLOYED_AT
) {
	throw new Error("Built release identity does not match the candidate source and deployment timestamp.");
}
copyFileSync("front-end/dist/release.json", ".operation-opportunity-release-prepared.json");
NODE

npm ci --omit=dev --include=optional --ignore-scripts
npm audit --omit=dev --audit-level=high
node - <<'NODE'
import argon2 from "argon2";
const value = "operation-opportunity-direct-runtime";
const hash = await argon2.hash(value);
if (!(await argon2.verify(hash, value))) throw new Error("The production Argon2 binding failed verification.");
await import("./back-end/dist/app.js");
NODE
echo "Prepared direct runtime release $candidate at $OPPORTUNITY_COMMIT_SHA."
