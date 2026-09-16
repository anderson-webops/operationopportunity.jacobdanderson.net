# Operation Opportunity capacity audit, 2026-09-16

Baseline: `7ec0958ea3d92670788a0a336c12637b96dd4102`, v2.3.1. Published source: `95a8508d3aa23f0988b932a712edbf69bbe47e04`,
[v2.3.2](https://github.com/anderson-webops/operationopportunity.jacobdanderson.net/releases/tag/v2.3.2). This is the first
capacity milestone, not completion of the whole site/fleet audit.
Production was not accessed or changed. The static Vue frontend already needs no
Node service. The API was already compiled; maintenance commands now also use
compiled JavaScript instead of TypeScript loaders.

## Implemented bounds

- Admit 64 requests before JSON/session parsing; 256 listener connections, finite
  header/body/keepalive timeouts. A disconnected accepted mutation retains its
  slot until actual work and security auditing finish. Callback-based session
  lookups also retain admission; shutdown waits before storage disposal.
- Limit Argon2 to 2 active operations and 32 queued operations. Preserve argon2id,
  65536 KiB memory, time 3, parallelism 1 and dummy verification for unknown logins.
- Keep each rate limiter to 10,000 identity counters plus a conservative overflow
  bucket, without evicting live counters or weakening existing rate thresholds.
- Mongo pool 20, no idle minimum, at most 2 connecting, 60 s idle timeout, 5 s operation
  deadline and 1 s wait-queue bound. Cancel disconnected read queries only; accepted
  writes continue. Identity reservations survive ambiguous write acknowledgments;
  only known precommit failures release them. Overlapping readiness checks share one 1.5 s ping with 32 waiters.
- Bound structured log records and queued output; output backpressure fails
  readiness and closes admission before unbounded buffering. Drain audit records
  at shutdown. Consume/cancel Vault response streams on all paths.
- Repeated signals share one drain, partial startup cleans up, failures exit
  unsuccessfully and a 15 s deadline bounds shutdown. No periodic restarts or global
  heap limits are used. Existing role, identity and authorization checks remain.

## Matched measurements

Three fresh-process runs per variant, Node 24.18.1 on macOS ARM64, same compiled
workloads and fixtures, no forced GC or heap cap. Raw records:
[password](measurements/capacity-password-2026-09-16.json) and
[HTTP](measurements/capacity-http-2026-09-16.json). Commands are in
`scripts/measure-password-capacity.mjs` and `scripts/measure-http-capacity.mjs`.
The baseline comes from a clean detached worktree; only the new compiled source
varies. Every comparison checks identical semantic response hashes.

| Workload, median | Baseline | Candidate | Interpretation |
| --- | ---: | ---: | --- |
|12 simultaneous account creations, peak sampled RSS |347.36 MiB |218.67 MiB |37.0% lower |
|Same batch completion |356.10 ms |623.06 ms |75.0% slower, deliberate concurrency tradeoff |
|Normal quote HTTP, peak RSS |268.03 MiB |276.52 MiB |3.2% higher |
|Normal quote HTTP, p95 |4.88 ms |5.11 ms |4.7% higher |
|256 stalled bodies, peak RSS |222.20 MiB |219.09 MiB |1.4% lower; primary result is bounded admission |
|Excess stalled requests rejected 503 |0 |192 |64 admitted; fresh read succeeds after disconnect |

Account measurement includes two warmups, twelve real account and unique-identity
writes, verification of every password and a 2 s recovery observation. Idle memory
is 84.83 versus 84.50 MiB; recovery remains 347.36 versus 218.67 MiB. Normal HTTP uses 100
warmup reads and 800 reads at concurrency 8 with an identical loopback provider.
Its idle RSS is 99.58 versus 99.09 MiB; warmed RSS 205.17 versus 205.53 MiB. The HTTP
harness includes its synthetic provider in the measured process and uses test
sessions, so it is not a production authentication or Mongo benchmark. Native
Mongo timeout/cancellation tests are separate. Memory remains elevated after the
short recovery periods; no long-term leak-free claim is made. These final paired
runs use exact candidate source `95a8508d3aa23f0988b932a712edbf69bbe47e04`,
after its identity-reservation correction, with the ARM64 builder stopped.

## Validation and remaining work

Local clean install, lint, types, 47 frontend tests, 72 backend tests with no skips,
compiled builds, build-secret/security checks and a standalone production install
passed. Full and production audits reported zero; 916 registry signatures and 282
attestations verified. Real synthetic Mongo tests prove shared readiness deadlines,
health during dependency delay, query cancellation and recovery. Capacity tests
cover retained disconnected work, callback session lookup, rate-key churn,
password cost/queue release, failed log output and partial startup/shutdown.

One earlier full run returned 200 instead of the existing expected 404 in a tutor
assignment assertion while a separate fixture setup failed. Its cause is not
established. The assertion was not weakened; response diagnostics were added.
The isolated case, the full authorization file, the repaired 71-test suite and
eight additional full authorization runs passed. Retain that discrepancy for
investigation if it recurs. The invalid overlong Mongo fixture name and its setup
cleanup were corrected independently.

The independent artifact manifest, verifier, negative-module and copied-tree tests
are defined in [the runtime contract](runtime-artifact-contract.md). Exact Linux
ARM64 build and unpacked acceptance passed; the evidence is recorded in
[the acceptance report](runtime-acceptance-2026-09-16.md). A passing source build alone is not
artifact acceptance or deployment.

Still open: bounded complete identity-registry initialization; paged complete
admin/tutor/user directories; frontend account-switch/logout request fencing and
draft retention; authorization lease lifetime, including interactive operator
commands; maintenance-command pool policy; longer recovery/soak observations.
These are not waived or hidden by the completed admission/password milestone.

An additional real-Mongo regression models committed account creation and email
change followed by lost acknowledgments. Cross-role reservation attempts stay
denied; authoritative startup reconciliation removes only the stale reservation.
