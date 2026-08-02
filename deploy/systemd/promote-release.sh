#!/usr/bin/env bash
set -euo pipefail

PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export PATH

release_root="${RELEASE_ROOT:-/srv/operation-opportunity/releases}"
current_link="${CURRENT_LINK:-/srv/operation-opportunity/current}"
release_env_dest="${RELEASE_ENV_DEST:-/etc/operation-opportunity/release.env}"
service_name="${SERVICE_NAME:-operation-opportunity-api.service}"
api_health_url="${API_HEALTH_URL:-http://127.0.0.1:3002/healthz}"
api_ready_url="${API_READY_URL:-http://127.0.0.1:3002/readyz}"
site_origin="${SITE_ORIGIN:-https://operationopportunity.jacobdanderson.net}"
site_resolve_ipv4="${SITE_RESOLVE_IPV4:-operationopportunity.jacobdanderson.net:443:127.0.0.1}"
site_resolve_ipv6="${SITE_RESOLVE_IPV6:-operationopportunity.jacobdanderson.net:443:[::1]}"

if [[ $# -ne 1 ]]; then
	echo "Usage: promote-release.sh /srv/operation-opportunity/releases/<prepared-release>" >&2
	exit 2
fi
if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
	echo "Run promotion with root privileges." >&2
	exit 1
fi

release_root_real="$(cd -- "$release_root" && pwd -P)"
candidate="$(cd -- "$1" && pwd -P)"
case "$candidate/" in
	"$release_root_real/"*) ;;
	*) echo "Candidate must resolve beneath $release_root_real: $candidate" >&2; exit 1 ;;
esac
if [[ "$candidate" == "$release_root_real" ]]; then
	echo "Candidate must be a prepared release beneath, not equal to, $release_root_real." >&2
	exit 1
fi

for required_file in \
	back-end/dist/server.js \
	front-end/dist/index.html \
	front-end/dist/release.json \
	.operation-opportunity-release-prepared.json; do
	if [[ ! -f "$candidate/$required_file" ]]; then
		echo "Prepared release is missing $required_file." >&2
		exit 1
	fi
done
if ! cmp -s "$candidate/front-end/dist/release.json" "$candidate/.operation-opportunity-release-prepared.json"; then
	echo "Prepared release metadata does not match the public release identity." >&2
	exit 1
fi
if [[ -e "$current_link" && ! -L "$current_link" ]]; then
	echo "Refusing to replace non-symlink deployment path: $current_link" >&2
	exit 1
fi

previous_target="$(readlink -f -- "$current_link" 2>/dev/null || true)"
if [[ -n "$previous_target" ]]; then
	case "$previous_target/" in
		"$release_root_real/"*) ;;
		*) echo "Existing deployment target is outside $release_root_real: $previous_target" >&2; exit 1 ;;
	esac
	if [[ "$previous_target" == "$release_root_real" ]]; then
		echo "Existing deployment target must be a release beneath $release_root_real." >&2
		exit 1
	fi
fi

next_link="${current_link}.next.$$"
response_api="$(mktemp)"
response_ipv4="$(mktemp)"
response_ipv6="$(mktemp)"
headers_static_ipv4="$(mktemp)"
headers_static_ipv6="$(mktemp)"
headers_api_ipv4="$(mktemp)"
headers_api_ipv6="$(mktemp)"
release_env_temp="$(mktemp)"
cleanup() {
	if [[ -L "$next_link" ]]; then unlink -- "$next_link"; fi
	rm -f -- "$response_api" "$response_ipv4" "$response_ipv6" \
		"$headers_static_ipv4" "$headers_static_ipv6" "$headers_api_ipv4" "$headers_api_ipv6" "$release_env_temp"
}
trap cleanup EXIT

activate_target() {
	local target="$1"
	ln -s -- "$target" "$next_link"
	mv -Tf -- "$next_link" "$current_link"
}

write_release_environment() {
	local target="$1"
	/usr/bin/node -e '
const fs = require("node:fs")
const release = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
if (!/^[0-9a-f]{40}$/i.test(release.commit)) process.exit(1)
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(release.deployedAt)) process.exit(1)
process.stdout.write(`OPPORTUNITY_COMMIT_SHA=${release.commit}\nOPPORTUNITY_DEPLOYED_AT=${release.deployedAt}\n`)
' "$target/front-end/dist/release.json" > "$release_env_temp"
	install -D -o root -g operation-opportunity -m 0640 "$release_env_temp" "$release_env_dest"
}

identity_matches() {
	local expected="$1"
	local actual="$2"
	/usr/bin/node -e '
const fs = require("node:fs")
const expected = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
const actual = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
if (expected.release !== actual.release || expected.commit !== actual.commit || expected.deployedAt !== actual.deployedAt) process.exit(1)
' "$expected" "$actual"
}

static_headers_are_strict() {
	local headers="$1"
	grep -Eiq '^Content-Security-Policy:.*frame-ancestors .none.' "$headers" \
		&& grep -Eiq '^Content-Security-Policy:.*script-src[^;]*.self.' "$headers" \
		&& ! grep -Eiq '^Content-Security-Policy:.*script-src[^;]*unsafe-(inline|eval)' "$headers" \
		&& grep -Eiq '^X-Frame-Options:[[:space:]]*DENY' "$headers"
}

api_headers_are_strict() {
	local headers="$1"
	grep -Eiq '^Content-Security-Policy:.*default-src .none.' "$headers" \
		&& grep -Eiq '^Content-Security-Policy:.*frame-ancestors .none.' "$headers" \
		&& grep -Eiq '^X-Frame-Options:[[:space:]]*DENY' "$headers" \
		&& grep -Eiq '^Cache-Control:.*no-store' "$headers"
}

wait_for_target() {
	local target="$1"
	local attempt
	for attempt in {1..30}; do
		if curl --noproxy '*' --fail --silent --show-error --max-time 5 "$api_ready_url" --output "$response_api" \
			&& grep -Eq '"ready"[[:space:]]*:[[:space:]]*true' "$response_api" \
			&& identity_matches "$target/front-end/dist/release.json" "$response_api" \
			&& curl --noproxy '*' --fail --silent --show-error --max-time 5 "$api_health_url" --output "$response_api" \
			&& identity_matches "$target/front-end/dist/release.json" "$response_api" \
			&& curl --noproxy '*' --ipv4 --fail --silent --show-error --max-time 5 \
				--resolve "$site_resolve_ipv4" "$site_origin/release.json" --output "$response_ipv4" \
			&& curl --noproxy '*' --ipv6 --fail --silent --show-error --max-time 5 \
				--resolve "$site_resolve_ipv6" "$site_origin/release.json" --output "$response_ipv6" \
			&& cmp -s "$target/front-end/dist/release.json" "$response_ipv4" \
			&& cmp -s "$target/front-end/dist/release.json" "$response_ipv6" \
			&& curl --noproxy '*' --ipv4 --fail --silent --show-error --max-time 5 --resolve "$site_resolve_ipv4" \
				--dump-header "$headers_static_ipv4" "$site_origin/" --output /dev/null \
			&& curl --noproxy '*' --ipv6 --fail --silent --show-error --max-time 5 --resolve "$site_resolve_ipv6" \
				--dump-header "$headers_static_ipv6" "$site_origin/" --output /dev/null \
			&& curl --noproxy '*' --ipv4 --fail --silent --show-error --max-time 5 --resolve "$site_resolve_ipv4" \
				--dump-header "$headers_api_ipv4" "$site_origin/api/healthz" --output "$response_api" \
			&& identity_matches "$target/front-end/dist/release.json" "$response_api" \
			&& curl --noproxy '*' --ipv6 --fail --silent --show-error --max-time 5 --resolve "$site_resolve_ipv6" \
				--dump-header "$headers_api_ipv6" "$site_origin/api/healthz" --output "$response_api" \
			&& identity_matches "$target/front-end/dist/release.json" "$response_api" \
			&& static_headers_are_strict "$headers_static_ipv4" \
			&& static_headers_are_strict "$headers_static_ipv6" \
			&& api_headers_are_strict "$headers_api_ipv4" \
			&& api_headers_are_strict "$headers_api_ipv6"; then
			return 0
		fi
		sleep 1
	done
	return 1
}

activate_target "$candidate"
write_release_environment "$candidate"
if nginx -t && systemctl restart "$service_name" && systemctl reload nginx && wait_for_target "$candidate"; then
	echo "Promoted $candidate and verified API readiness, exact IPv4/IPv6 identity, and strict edge policy."
	exit 0
fi

echo "Candidate health or edge policy failed; restoring the previous release." >&2
if [[ -n "$previous_target" ]]; then
	activate_target "$previous_target"
	write_release_environment "$previous_target"
	systemctl restart "$service_name"
	nginx -t && systemctl reload nginx
	if ! wait_for_target "$previous_target"; then
		echo "The previous release was restored but did not pass readiness, identity, and edge checks." >&2
	fi
else
	unlink -- "$current_link"
	systemctl stop "$service_name"
	nginx -t && systemctl reload nginx
fi
exit 1
