# Operation Opportunity capacity audit, 2026-09-16

Baseline: `7ec0958ea3d92670788a0a336c12637b96dd4102`, v2.3.1. This is the first
capacity milestone toward v2.3.2, not completion of the whole site/fleet audit.
Production was not accessed or changed. The static Vue frontend already needs no
Node service. The API was already compiled; maintenance commands now also use
compiled JavaScript instead of TypeScript loaders.

## Implemented bounds

- Admit64 requests before JSON/session parsing;256 listener connections, finite
  header/body/keepalive timeouts. A disconnected accepted mutation retains its
  slot until actual work and security auditing finish. Callback-based session
  lookups also retain admission; shutdown waits before storage disposal.
- Limit Argon2 to2 active operations and32 queued operations. Preserve argon2id,
  65536KiB memory, time3, parallelism1 and dummy verification for unknown logins.
- Keep each rate limiter to10000 identity counters plus a conservative overflow
  bucket, without evicting live counters or weakening existing rate thresholds.
- Mongo pool20, no idle minimum, at most2 connecting,60s idle timeout,5s operation
  deadline and1s wait-queue bound. Cancel disconnected read queries only; accepted
  writes continue. Identity reservations survive ambiguous write acknowledgments;
  only known precommit failures release them. Overlapping readiness checks share one1.5s ping with32 waiters.
- Bound structured log records and queued output; output backpressure fails
  readiness and closes admission before unbounded buffering. Drain audit records
  at shutdown. Consume/cancel Vault response streams on all paths.
- Repeated signals share one drain, partial startup cleans up, failures exit
  unsuccessfully and a15s deadline bounds shutdown. No periodic restarts or global
  heap limits are used. Existing role, identity and authorization checks remain.

## Matched measurements

Three fresh-process runs per variant, Node24.18.1 on macOS ARM64, same compiled
workloads and fixtures, no forced GC or heap cap. Raw records:
[password](measurements/capacity-password-2026-09-16.json) and
[HTTP](measurements/capacity-http-2026-09-16.json). Commands are in
`scripts/measure-password-capacity.mjs` and `scripts/measure-http-capacity.mjs`.
The baseline comes from a clean detached worktree; only the new compiled source
varies. Every comparison checks identical semantic response hashes.

| Workload, median | Baseline | Candidate | Interpretation |
| --- | ---: | ---: | --- |
|12 simultaneous account creations, peak sampled RSS |347.30MiB |218.56MiB |37.1% lower |
|Same batch completion |359.02ms |625.76ms |74.3% slower, deliberate concurrency tradeoff |
|Normal quote HTTP, peak RSS |267.94MiB |276.28MiB |3.1% higher |
|Normal quote HTTP, p95 |5.13ms |5.31ms |3.4% higher |
|256 stalled bodies, peak RSS |222.11MiB |219.14MiB |1.3% lower; primary result is bounded admission |
|Excess stalled requests rejected503 |0 |192 |64 admitted; fresh read succeeds after disconnect |

Account measurement includes two warmups, twelve real account and unique-identity
writes, verification of every password and a2s recovery observation. Idle memory
is84.84 versus84.52MiB; recovery remains347.30 versus218.56MiB. Normal HTTP uses100
warmup reads and800 reads at concurrency8 with an identical loopback provider.
Its idle RSS is99.69 versus99.13MiB; warmed RSS205.22 versus205.45MiB. The HTTP
harness includes its synthetic provider in the measured process and uses test
sessions, so it is not a production authentication or Mongo benchmark. Native
Mongo timeout/cancellation tests are separate. Memory remains elevated after the
short recovery periods; no long-term leak-free claim is made.

## Validation and remaining work

Local clean install, lint, types,47 frontend tests,72 backend tests with no skips,
compiled builds, build-secret/security checks and a standalone production install
passed. Full and production audits reported zero;916 registry signatures and282
attestations verified. Real synthetic Mongo tests prove shared readiness deadlines,
health during dependency delay, query cancellation and recovery. Capacity tests
cover retained disconnected work, callback session lookup, rate-key churn,
password cost/queue release, failed log output and partial startup/shutdown.

One earlier full run returned200 instead of the existing expected404 in a tutor
assignment assertion while a separate fixture setup failed. Its cause is not
established. The assertion was not weakened; response diagnostics were added.
The isolated case, the full authorization file, the repaired71-test suite and
eight additional full authorization runs passed. Retain that discrepancy for
investigation if it recurs. The invalid overlong Mongo fixture name and its setup
cleanup were corrected independently.

The independent artifact manifest, verifier, negative-module and copied-tree tests
are defined in [the runtime contract](runtime-artifact-contract.md). Exact Linux
ARM64 build and unpacked acceptance are required before release publication;
that evidence will be recorded separately. A passing source build alone is not
artifact acceptance or deployment.

Still open: bounded complete identity-registry initialization; paged complete
admin/tutor/user directories; frontend account-switch/logout request fencing and
draft retention; authorization lease lifetime, including interactive operator
commands; maintenance-command pool policy; longer recovery/soak observations.
These are not waived or hidden by the completed admission/password milestone.

An additional real-Mongo regression models committed account creation and email
change followed by lost acknowledgments. Cross-role reservation attempts stay
denied; authoritative startup reconciliation removes only the stale reservation.
