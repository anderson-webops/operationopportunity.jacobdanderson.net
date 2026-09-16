#!/bin/bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
test "$(id -u)" -ne 0
test "$(uname -s)" = Linux
test "$(uname -m)" = aarch64
test "$(node --version)" = v24.18.1
test "$(npm --version)" = 12.0.2
test -z "$(git status --porcelain)"
git check-ignore -q .ai-work/
commit=$(git rev-parse HEAD)
version=$(node -p 'require("./package.json").version')
output=${1:?Pass output under .ai-work/runs/}
mkdir -p "$output"
output=$(realpath "$output")
case "$output/" in "$PWD/.ai-work/runs/"*) ;; *) exit 2 ;; esac
test -n "${TEST_MONGODB_URI:-}"
test -n "${MONGO_FAULT_TEST_URI:-}"
stage=$(mktemp -d "$output/stage.XXXXXX")
unpacked=$(mktemp -d "$output/unpacked.XXXXXX")
negative=$(mktemp -d "$output/negative.XXXXXX")
trap 'rm -rf -- "$stage" "$unpacked" "$negative"' EXIT
export CYPRESS_INSTALL_BINARY=0 PUPPETEER_SKIP_DOWNLOAD=true
npm ci --include=dev --include=optional --strict-allow-scripts
npm run lint
npm run typecheck
npm test
export OPPORTUNITY_COMMIT_SHA="$commit"
export OPPORTUNITY_DEPLOYED_AT=2026-09-16T00:00:00.000Z
npm run build
npm run verify:build-security
npm run verify:api-production-install
npm audit --json > "$output/audit-full.json"
npm audit --omit=dev --json > "$output/audit-production.json"
npm audit signatures > "$output/signatures.log"
python3 -B -m unittest discover -s scripts -p 'test_runtime_artifact.py' -v
cp package.json package-lock.json "$stage/"
mkdir -p "$stage/back-end" "$stage/front-end"
cp back-end/package.json back-end/package-lock.json back-end/.npmrc "$stage/back-end/"
cp front-end/package.json "$stage/front-end/"
cp -R back-end/dist "$stage/back-end/"
cp -R front-end/dist "$stage/front-end/"
(cd "$stage/back-end" && npm ci --workspaces=false --omit=dev --include=optional --strict-allow-scripts && npm audit --workspaces=false --omit=dev --audit-level=low)
rm "$stage/back-end/.npmrc"
# Executable links are build tooling, not runtime module dependencies.
find "$stage/back-end/node_modules" -type d -name .bin -prune -exec rm -rf '{}' +
archive="$output/operation-opportunity-v$version-${commit:0:12}-linux-arm64.tar.gz"
python3 -B scripts/runtime-artifact.py pack "$stage" --archive "$archive" --commit "$commit" > "$output/artifact.json"
sha=$(sha256sum "$archive" | cut -d ' ' -f 1)
python3 -B scripts/runtime-artifact.py unpack "$unpacked" --archive "$archive" --sha256 "$sha" --commit "$commit"
cp -R "$unpacked/." "$negative/"
rm "$negative/back-end/dist/runtimeCapacity.js"
bash scripts/test-unpacked-artifact.sh "$negative" missing-module > "$output/acceptance.jsonl"
bash scripts/test-unpacked-artifact.sh "$unpacked" complete >> "$output/acceptance.jsonl"
python3 -B - "$archive" "$commit" "$output" <<'PY'
import hashlib,json,pathlib,sys
archive,commit,output=pathlib.Path(sys.argv[1]),sys.argv[2],pathlib.Path(sys.argv[3])
records=[json.loads(line) for line in (output/'acceptance.jsonl').read_text().splitlines()]
assert any(r.get('negativeModule')=='passed' for r in records)
assert any(r.get('accepted') is True and r.get('commit')==commit for r in records)
assert any(r.get('soak',{}).get('passed') is True and r['soak']['commit']==commit for r in records)

harness=[pathlib.Path('scripts/test-unpacked-artifact.sh'),pathlib.Path('scripts/runtime-artifact.py'),pathlib.Path('deploy/runtime-artifact.json'),*pathlib.Path('scripts/artifact-acceptance').glob('*')]
receipt={'passed':True,'commit':commit,'archiveSha256':hashlib.file_digest(archive.open('rb'),'sha256').hexdigest(),'harnessFiles':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in harness if p.is_file()}}
(output/'acceptance-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
PY
test -z "$(git status --porcelain)"
printf '%s  %s\n' "$sha" "$(basename "$archive")" > "$archive.sha256"
cp "$unpacked/runtime-manifest.json" "$archive.manifest.json"
cat "$output/artifact.json" "$output/acceptance-receipt.json"
