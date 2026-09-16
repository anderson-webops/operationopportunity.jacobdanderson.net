# Exact runtime acceptance, 2026-09-16

Source and annotated release: **v2.3.2,
95a8508d3aa23f0988b932a712edbf69bbe47e04**. This is source/artifact publication;
production activation was neither performed nor verified.

Archive `operation-opportunity-v2.3.2-95a8508d3aa2-linux-arm64.tar.gz` contains 1,904
independently verified runtime files,3,955, 532 compressed bytes.
SHA-256: `a3fe32b93e8f6700a1818d56e31b2d96404c7f2be72f62a71956653c7ce230b2`.

The [receipt](validation/capacity-acceptance-receipt.json) and
[acceptance records](validation/capacity-acceptance.jsonl) bind the archive to the
source commit and all harness hashes. Host-side verification independently checked
the copied archive, exact unpacked tree, identical manifest sidecar, source locks
and every harness file. Required paths are checked independently of inventories.

A disposable Ubuntu 24.04 ARM64 builder ran Node 24.18.1/npm 12.0.2, clean locked
installs, lint/types/builds, 47 frontend tests, 72 backend tests with no skips and 6
artifact regressions. Full and production audits were zero; 915 registry signatures
and 282 attestations verified on Linux. The local signature count is 916 because
platform-selected optional packages differ. Native Argon2 and a separate
production-only installation passed. No dependency versions were changed.

The negative tree deliberately omitted a required runtime module and actual
compiled startup failed. The complete tree ran with no checkout/development
packages, no capabilities, immutable files, isolated loopback and synthetic
MongoDB/provider data. Native hashing, entrypoint guards, GET/HEAD probes, exact
identity, signup/login/CSRF/role denial/logout, provider/database failure recovery,
retained session/account restart and repeated-signal shutdown all passed. A client
disconnected during an accepted account update; shutdown preserved that update
and completed its security audit before storage closed.

The compiled artifact completed13, 584 authenticated reads over 60 s at concurrency 8
with p95 latency 13.84 ms. RSS was 111.14 MiB before load and 185.77 MiB after load and 5 s
idle. This demonstrates finite functional/recovery coverage, not a plateau or
long-term leak freedom. Broader resource review remains open. Matched baseline and
candidate workload evidence and tradeoffs are in the
[capacity report](capacity-audit-2026-09-16.md).

The first disposable VM attempt exited before validation because its bundle clone
had an unborn default branch. Explicit branch selection corrected the fixture.
The second VM finished every source and artifact gate and powered off. A narrowly
scoped builder AppArmor profile permits bubblewrap user namespaces; no production
security policy changed. Private GitHub jobs are not completion evidence.

Follow [the operator contract](runtime-artifact-contract.md), including the
source-checkout versus runtime-artifact adapter distinction. Preserve the current
service topology, external database/session state, protected configuration and
exact retained rollback. This release changes no schema and does not authorize
DNS, Nginx, runtime-prefix or service topology migrations.
