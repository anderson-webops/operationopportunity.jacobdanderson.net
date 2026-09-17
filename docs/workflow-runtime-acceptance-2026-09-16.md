# Workflow runtime acceptance, 2026-09-16

Published release: [v2.3.5](https://github.com/anderson-webops/operationopportunity.jacobdanderson.net/releases/tag/v2.3.5). Published at 2026-09-17T01:10:45Z.
Application source: `0acd8c9194850f9d95a372ccca49010fac2bfac7`.
Annotated tag object: `94f742e28f3dee47b0d9f2872b32a2792090faf9`.

Archive: `operation-opportunity-v2.3.5-0acd8c919485-linux-arm64.tar.gz`; 3,973,011 bytes.
SHA-256: `22a023b0a897839fc20dd601be45e84187b13b6f6e6aebabc1711ea7cfbfd932`.

All five release files were independently downloaded and compared byte for byte,
including their GitHub sizes and digests. Remote refs, release text, manifest
sidecar, both source lockfiles and the copied 1,912-file tree match the
reviewed source and archive. The [machine-readable evidence](measurements/workflow-artifact-acceptance-2026-09-16.json)
records these identities, the acceptance receipt and every harness hash.

## Exact source and unpacked runtime

Unprivileged Linux ARM64, Node 24.18.1/npm 12.0.2: clean locked install,
lint/types/builds, 66 frontend and 97 backend checks with no skipped tests,
six artifact regressions, production native binding verification, zero full and
production audit findings, 915 registry signatures and 282 attestations.
The matching local source checks verified 916 registry signatures.

The exact artifact ran read-only without source, development modules, external
network access, production secrets or provider messages. Acceptance covered the
negative missing-module startup; native binding; compiled server and maintenance
configuration guards; startup cancellation and private-index cleanup; rejection
of RAM-backed identity scratch; minimal GET/HEAD probes; exact static/API identity;
signup/login/logout and CSRF/role boundaries; complete paged/legacy directories
and public-field filtering; Quotes/MongoDB failure and recovery; accepted-write
drain/audit after client disconnect; repeated signals; and retained-account and
session restart. Privileged interactive recovery was not performed.

The 600-second authenticated-read load completed **149,244 requests**
at concurrency eight, with p95 **11 ms** using a bounded one-millisecond
histogram. RSS was **115.98 MiB** before load,
**194.06 MiB** after load and
**194.06 MiB** after 65 idle seconds. The trace crosses
the database pool's 60-second idle threshold but retains elevated process RSS.
There is no indefinite leak-free or overall memory-reduction claim.

The final artifact's compiled frontend also passed Chrome's blocked lazy-download
and subsequent-navigation regression. Separate [public navigation traces](measurements/navigation-lifetime-2026-09-16.json)
verify 181 transitions per version, at most one pending quote and complete quote
cancellation after leaving Home. The real-router regression proves that the
progress timer also stops after a failed download. The [source review matrix](memory-efficiency-review-2026-09-16.md)
records each goal area and the existing static frontend architecture.

## Operator handoff and rollback

Review the [runtime artifact contract](runtime-artifact-contract.md) before any
activation. Preserve installed service paths/users/ports, the existing Node prefix,
protected environment and authenticated external MongoDB/session state. Keep the
Quotes service separate and private identity scratch disk-backed and outside the
release. Do not alter DNS, certificates or Nginx policy.

Use only a reviewed artifact adapter, never the source-checkout preparation scripts
or a forged marker. Verify the archive and the actual copied tree, then atomically
promote with only this API's stop/drain/restart. Old and new API processes and
maintenance writers must not overlap: the bounded local queue is not a distributed
fencing mechanism. Check readiness and exact API/static identity; retain the
previous immutable artifact and independent component rollback.

The exact retained v2.3.4 API passed directories, profile writes, role boundaries
and sessions against the additive tutor index. There is no record/schema format
migration. Rolling back also restores its earlier lease limitation. Never copy
database/session state from an application release or roll back unrelated services.

This completes this source/release milestone. Production activation was neither
performed nor verified. The full Sites memory-efficiency audit remains active.
