#!/usr/bin/env bash
set -euo pipefail

PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
unit_dest="${UNIT_DEST:-/etc/systemd/system/operation-opportunity-api.service}"
api_env_dest="${API_ENV_DEST:-/etc/operation-opportunity/api.env}"
release_env_dest="${RELEASE_ENV_DEST:-/etc/operation-opportunity/release.env}"
release_root="${RELEASE_ROOT:-/srv/operation-opportunity/releases}"
dry_run=false
force_env=false

usage() {
	cat <<'USAGE'
Install the direct Operation Opportunity API unit without starting it.

Usage: install-api-unit.sh [--dry-run] [--force-env]

  --dry-run    Print commands without changing the host.
  --force-env  Replace the API environment with the fail-closed example.
USAGE
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--dry-run) dry_run=true ;;
		--force-env) force_env=true ;;
		-h|--help) usage; exit 0 ;;
		*) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
	esac
	shift
done

run() {
	if [[ "$dry_run" == true ]]; then
		printf ' %q' "$@"
		printf '\n'
		return 0
	fi
	"$@"
}

if [[ "$dry_run" == false ]]; then
	if [[ ! -x /usr/bin/node || "$(/usr/bin/node --version)" != "v24.18.1" ]]; then
		echo "The systemd runtime requires Node 24.18.1 at /usr/bin/node." >&2
		exit 1
	fi
	if ! id operation-opportunity >/dev/null 2>&1; then
		echo "Create the unprivileged operation-opportunity service account before installing the unit." >&2
		exit 1
	fi
fi

run install -d -o operation-opportunity -g operation-opportunity -m 0750 "$release_root"
run install -D -m 0644 "$script_dir/operation-opportunity-api.service" "$unit_dest"
if [[ "$force_env" == true || ! -e "$api_env_dest" ]]; then
	run install -D -o root -g operation-opportunity -m 0640 "$script_dir/api.env.example" "$api_env_dest"
else
	echo "Keeping existing $api_env_dest. Use --force-env only when replacing it intentionally."
fi
if [[ ! -e "$release_env_dest" ]]; then
	run install -D -o root -g operation-opportunity -m 0640 "$script_dir/release.env.example" "$release_env_dest"
fi
run systemctl daemon-reload
echo "Review $api_env_dest, install both Nginx location includes, then prepare and promote a release."
