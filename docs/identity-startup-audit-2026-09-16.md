# Complete, bounded startup identity verification

Candidate v2.3.3 replaces unbounded account arrays, a whole-registry array and an
in-memory identity map with 128-row MongoDB cursors and a private disk-backed
SQLite index. It checks the complete account set, preserves JavaScript Unicode
normalization, detects cross-role duplicates before repairing identities, and
avoids rewriting already-correct registry rows. It introduces no npm dependency,
durable schema change, account limit or truncated verification.

The index uses the pinned Node runtime's built-in SQLite, a two-MiB page cache,
no memory mapping and no loadable extensions. Scratch must be disk-backed and
outside the immutable release. Directory/file modes are 0700/0600. SQLite state
is explicitly forbidden in runtime archives. Startup cancellation releases the
cursor/index without binding a listener or reporting a normal stop as a failed
start. Accepted HTTP writes keep the previous graceful-drain contract.

Maintenance CLIs now share the bounded database-pool/operation policy. The admin
manager recovery prompt occurs before taking the existing expiring authorization
lock; the privileged eligibility checks remain within the lock. This does not
add lock renewal or claim to resolve that wider coordination audit.

## Paired local measurements

Baseline: `8e95c5a5a74c38728cdfa7bd3821c49b77748bfb` (v2.3.2 application).
Candidate source/harness digests and every sample result are in
[`measurements/identity-startup-2026-09-16.json`](measurements/identity-startup-2026-09-16.json).
Node 24.18.1, macOS ARM64, synthetic MongoDB 8.0.32. Three paired fresh processes
per scenario, alternating order; medians below. Both variants use the same data,
database policy and compiled code paths. Seeding and complete result hashing run
outside the measured process. Each process connects and initializes models before
the measured identity routine. No heap cap or forced collection is used.

| Scenario | Baseline | Candidate | Change |
| --- | ---: | ---: | ---: |
| 30,000 correct accounts: peak RSS | 342.80 MiB | 116.66 MiB | 66.0% lower |
| Same: peak JavaScript heap | 156.80 MiB | 33.61 MiB | 78.6% lower |
| Same: verification duration | 4,176.49 ms | 327.09 ms | 92.2% shorter |
| Same: idle RSS before work | 86.53 MiB | 84.97 MiB | essentially unchanged |
| Same: RSS after one-second recovery | 342.14 MiB | 116.66 MiB | remains above idle |
| 3,000 legacy accounts: peak RSS | 130.83 MiB | 122.45 MiB | 6.4% lower |
| Same: repair duration | 786.69 ms | 618.57 ms | 21.4% shorter |

For the correct registry, the baseline performs 30,000 updates and 30,004 find
commands; the candidate performs zero updates and four find commands plus 468
bounded getMore calls. The legacy case normalizes all 3,000 accounts, checks the
1,500 existing identities, and recreates the other 1,500. Both variants yield
identical complete semantic hashes across all three roles and the registry in
every pair. No rows are dropped or silently skipped.

The larger candidate's sampled disk index is 3,265,040 bytes. A small index may
fit mostly in the bounded SQLite page cache until it is discarded, so sampled
file size is not a general disk-capacity guarantee. Twenty-ms memory samples can
miss brief peaks; process-lifetime high-water RSS is also recorded. One second of
recovery does not establish leak freedom. These are startup-identity results,
not full boot latency, normal request throughput, whole-host memory or Pi results.

Reproduce with an owned loopback Mongo fixture, built baseline/candidate and the
pinned Node runtime:

```sh
node scripts/measure-identity-startup.mjs BASELINE_CHECKOUT CANDIDATE_CHECKOUT mongodb://127.0.0.1:55645/operation_security_test CANDIDATE_CHECKOUT/.ai-work/runs/identity-comparison
```

## Correctness and release gates

Regressions cover all account roles over multiple cursor batches, Unicode email
distinctions, late duplicates including the same ObjectId in different roles,
unchanged-startup zero writes, unavailable scratch failing before database access,
blocked-query cancellation and private scratch cleanup/recovery. Artifact tests
independently require the new compiled module, reject private SQLite files, and
exercise actual server cancellation plus tmpfs rejection in isolated Linux.
Backend test files run sequentially because MongoDB's `failCommand` test fixture
is server-global even when it filters by application name. Concurrent fault
suites could replace or clear one another's failpoint; serialization preserves
the real failure/recovery assertions rather than making them timing-dependent.

Final exact-source Linux ARM64 validation and publication evidence is recorded in
[`identity-runtime-acceptance-2026-09-16.md`](identity-runtime-acceptance-2026-09-16.md).
A successful local build alone is not artifact acceptance. The prior release and
its assets remain immutable.

Local clean locked install, lint, types, 47 frontend and 79 backend tests (no
skips), compiled builds, build-security and standalone production/native-install
checks passed. Full and production audits found zero vulnerabilities; 916
registry signatures and 282 attestations verified. All six artifact regressions,
shell validation and JavaScript syntax checks passed. The first concurrent
backend run exposed the fixture interference above; the corrected sequential
suite passed all failure/recovery cases without weakening their assertions.

## Activation and remaining boundaries

Follow [`runtime-artifact-contract.md`](runtime-artifact-contract.md), preserving
the installed service, environment ownership/modes, listeners, Quotes separation,
Nginx/TLS/IPv4/IPv6 and exact retained rollback. Verify disk-backed private scratch
and capacity before activation. The operator's reviewed adapter must verify the
actual tree after copying. No production changes were made by this source work.

Reconciliation still requires exclusive account-write access during startup or
maintenance; this is not a transaction or distributed startup lock. Ordinary
failure/cancellation removes scratch, but uncatchable process/host failure may
leave private scratch until the service temporary namespace is retired. Do not
copy it into releases, logs or reports. Repairs are restartable, not all-or-nothing.

Full directory pagination, frontend session/request lifetime and draft retention,
authorization-lease renewal, and longer recovery/soak review remain open. Neither
this site's broader audit nor the fleet goal is complete.
