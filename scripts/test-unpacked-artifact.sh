#!/bin/bash
set -euo pipefail
artifact=$(realpath "${1:?Pass the exact unpacked artifact}")
case_name=${2:-complete}
[[ "$case_name" == complete || "$case_name" == missing-module ]]
script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
node=$(realpath "$(command -v node)")
test "$(id -u)" -ne 0
test "$(uname -s)" = Linux
test "$(uname -m)" = aarch64
test "$(node --version)" = v24.18.1
test -x /usr/bin/mongod
if [[ "$case_name" == complete ]]; then
  python3 -B "$script_dir/runtime-artifact.py" verify "$artifact"
fi
timeout -k 5 360 bwrap --unshare-all --die-with-parent --new-session \
  --ro-bind /usr /usr --symlink usr/bin /bin --symlink usr/sbin /sbin --symlink usr/lib /lib \
  --ro-bind "$node" /runtime/node --proc /proc --dev /dev --tmpfs /tmp --tmpfs /state \
  --ro-bind /sys/devices/system/cpu/possible /sys/devices/system/cpu/possible \
  --dir /run --dir /run/quotes --ro-bind "$artifact" /app \
  --ro-bind "$script_dir/artifact-acceptance" /harness \
  --clearenv --setenv PATH /runtime:/usr/bin:/bin --setenv HOME /state \
  --chdir /app /runtime/node /harness/runtime.mjs "$case_name" "$script_dir"
if [[ "$case_name" == complete ]]; then
  python3 -B "$script_dir/runtime-artifact.py" verify "$artifact"
fi
