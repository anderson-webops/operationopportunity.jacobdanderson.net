#!/bin/bash
set -euo pipefail
umask 077
test "${GITHUB_ACTIONS:-}" = true
test "${RUNNER_ENVIRONMENT:-}" = github-hosted
test "$(id -u)" -ne 0
test "$(uname -s)" = Linux
test "$(uname -m)" = aarch64
cd "$(dirname "$0")/.."
printf '/.ai-work/\n' >> "$(git rev-parse --git-path info/exclude)"
run_root="$PWD/.ai-work/runs/ci-runtime"
test ! -e "$run_root"
mkdir -p "$run_root"/{mongo,tmp,artifact}
printf '# CI runtime acceptance\n\nExact source: %s. Synthetic loopback fixtures and disposable build output.\n' "$(git rev-parse HEAD)" > .ai-work/INDEX.md
export TMPDIR="$run_root/tmp"
export TEST_MONGODB_URI=mongodb://127.0.0.1:33712/operation_security_test_ci
export MONGO_FAULT_TEST_URI=mongodb://127.0.0.1:33712/operation_security_test_control
mongod --dbpath "$run_root/mongo" --bind_ip 127.0.0.1 --port 33712 --nounixsocket \
  --wiredTigerCacheSizeGB 0.25 --setParameter enableTestCommands=1 --logpath "$run_root/mongo.log" &
mongo_pid=$!
trap 'kill -TERM "$mongo_pid" 2>/dev/null || true; wait "$mongo_pid" || true' EXIT
for attempt in {1..30}; do
  kill -0 "$mongo_pid"
  if (echo > /dev/tcp/127.0.0.1/33712) >/dev/null 2>&1; then
    break
  fi
  test "$attempt" -lt 30
  sleep 1
done
npm run verify:build-tools
bash scripts/build-arm64-release.sh "$run_root/artifact"
