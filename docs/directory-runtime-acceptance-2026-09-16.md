# Directory runtime acceptance, 2026-09-16

Published release: [v2.3.4](https://github.com/anderson-webops/operationopportunity.jacobdanderson.net/releases/tag/v2.3.4). Published at 2026-09-16T18:35:43Z.
Application source: 9ade7e3ca2af127f0c19398ffcf3fe637920cc16.
Annotated tag object: 8da3e6f280b4cfa0dae0b22b7286fa19b9f7e7ac.

Archive: operation-opportunity-v2.3.4-9ade7e3ca2af-linux-arm64.tar.gz; 3,972,080 bytes.
SHA-256: 5c96beab987a79515dcd1d16a23594c6ae01213d602b351b42dbe0c3015d6f03.

The [machine-readable evidence](measurements/directory-artifact-acceptance-2026-09-16.json)
contains all five verified remote file sizes/hashes, exact refs, harness hashes and
raw acceptance records. Each published file was downloaded and compared byte for
byte with its independently verified local counterpart. Release notes also match.
The archive manifest, both source lockfiles and the actual copied 1,911-file tree
were verified after extraction and a second copy.

## Acceptance and scope

Unprivileged Linux ARM64, Node 24.18.1/npm 12.0.2: clean locked install, lint,
types, 65 frontend and 87 backend tests (no skips), compiled builds, production
install, native Argon2, zero full/production audits, 915 registry signatures and
282 attestations. All six artifact regressions passed. Local verification
reported 916 signatures; the ARM64 target reported 915.

The exact production artifact ran without source/development dependencies,
external network access, real provider messages or production credentials.
Acceptance verified the independent module inventory, negative missing-module
startup, compiled server/maintenance guards, minimal GET/HEAD probes, static/API
identity, signup/login/logout, CSRF/role denial, complete paged and legacy
user directories, late search, public tutor field filtering, database/provider
failure and recovery, disconnected accepted-write drain/audit, repeated signals,
and retained-account/session restart. Private startup-index cleanup/cancellation
and rejection of RAM-backed scratch also passed.

The 60-second authenticated-read soak, at concurrency 8, completed 15,157
requests with p95 9.62 ms. API RSS went from
117.09 MiB to 191.00 MiB,
and remained 191.00 MiB after five idle seconds.
This finite check is not evidence of long-term leak freedom. The separate
[paired directory report](directory-audit-2026-09-16.md) states memory improvements,
latency tradeoffs and differences in the initial UI workload explicitly.

## Delivery boundary and remaining work

This is source/release delivery, not production activation. Preserve the
[installed topology, writable-state and copier contract](runtime-artifact-contract.md)
and the [additive index/retained-application contract](directory-contract.md).
Do not feed the archive to source-checkout deployment scripts, forge preparation
markers, move service listeners, alter DNS or merge the separate Quotes service.
Keep the exact previous immutable application and external database/session data.

The wider authorization-lease review, high-pending-tutor query scaling and longer
load/recovery observations remain open, together with the full fleet audit.
No production access, deployment, configuration or credentials were changed.
