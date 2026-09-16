# v2.3.3 exact runtime and publication evidence

Published at 2026-09-16T17:29:12Z:
[Operation Opportunity v2.3.3](https://github.com/anderson-webops/operationopportunity.jacobdanderson.net/releases/tag/v2.3.3).
Application commit: `d76675e40e4fe610d03857bcfba6da00792ac296`.
Annotated tag object: `36dc16948d30f9ccf22749a0dc7f40669fb8b100`.

Archive: `operation-opportunity-v2.3.3-d76675e40e4f-linux-arm64.tar.gz`.
Size: 3,963,902 bytes; 1,905 inventoried files.
SHA-256: `56f407ed5ecdfb1aee9152fc66fb3d5757b24082af5ab8ad3883c887aa2b34c3`.

All five published assets were downloaded and compared byte-for-byte with the
verified builder output. Sizes/digests, release notes, remote main/tag identity,
manifest sidecar, source lockfiles and all acceptance-harness hashes matched.
The archive was independently unpacked, copied and verified again after copying.
See the [machine-readable record](measurements/identity-artifact-acceptance-2026-09-16.json).

## Exact target checks

The clean unprivileged Linux ARM64 builder used Node 24.18.1/npm 12.0.2. Clean
locked installation, lint, types, 47 frontend tests, 79 backend tests (no skips),
compiled builds, build-security, production/native install and six artifact
regressions passed. Full and production audits reported zero vulnerabilities;
915 registry signatures and 282 attestations verified.

The exact unpacked artifact ran read-only without application source, development
dependencies, real provider access or credentials. Its isolated loopback fixtures
verified native Argon2, compiled server and maintenance-entrypoint guards,
missing-module rejection, private disk-index permissions/cleanup, tmpfs rejection,
cancellation during a blocked startup query, GET/HEAD probes, signup/login/CSRF/
role separation/logout, provider and database recovery, disconnected accepted
write draining and auditing, repeated signals and retained account/session restart.
Private fixture state was disk-backed and removed by the harness.

The same artifact completed 15,006 authenticated reads in 60 seconds at
concurrency 8, p95 9.43 ms. RSS was 130.61 MiB before, 191.68 MiB under load and
191.68 MiB after five seconds idle. These finite measurements do not establish
long-term leak freedom or comparative steady-state savings. The separate paired
[startup report](identity-startup-audit-2026-09-16.md) quantifies the identity
routine's reduction with complete semantic equivalence.

## Activation boundary

This is source and artifact publication, not production deployment. Preserve the
existing host and service topology, protected environment files, database/session
state, Quotes service isolation, Nginx/TLS/IPv4/IPv6 and exact retained rollback.
The operator must verify disk-backed private scratch and reviewed exclusive
reconciliation access before activation, and verify the actual staged tree after
the deployment copier. The source-checkout adapter is not a runtime-artifact
adapter. Follow the exact-tag [operator contract](runtime-artifact-contract.md).

No new durable schema, production database/service mutation, host migration,
infrastructure change or incident-retry release was performed. Prior release
tags/assets are unchanged. Broader directory, session/draft, authorization-lease
and recovery/soak work remains open.
