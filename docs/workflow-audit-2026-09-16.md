# Authorization concurrency and public-query audit, 2026-09-16

Application release: **v2.3.5**. Baseline source is
`0b764a530f1a2db175041a513916f17ed2151878`, whose application and dependency inputs
match published v2.3.4. Raw measurements bind the compiled input files and source
locks. Exact Linux ARM64 acceptance and publication are recorded in the
[final runtime report](workflow-runtime-acceptance-2026-09-16.md); these local
results do not claim production activation.

## Reproduced findings and changes

1. A real 30-second Mongo authorization lease expired while its callback was still
   running. A second callback entered before the first finished, reproduced after
   30,210.95 ms on the baseline. The candidate keeps a process-owned FIFO slot
   until the callback and lock release actually settle. The same natural-expiry
   experiment did not overlap after 30,415.31 ms. A fast regression reproduces the
   persisted expired-lease state and verifies that a queued stale manager is
   denied after the preceding demotion finishes.
2. Every waiting request previously polled Mongo independently, with up to 50
   attempts whose database timeouts could accumulate. There are now at most 32
   waiters, only one process-local acquirer, and one five-second deadline across
   queueing and acquisition. Overflow/expired admission returns 503 before the
   account operation starts. Cancelled reads remove their timer, abort listener
   and queue entry. Accepted writes keep their request/drain slot across a client
   disconnect. Password cost, role checks and current-authority revalidation are
   unchanged.
3. Active public tutor pages used a name index that scanned inactive accounts.
   The additive `{status: 1, name: 1, _id: 1}` index reduces the first-page query's
   examined records and keys from 30,051 to 51 with 30,000 pending/suspended and
   300 active accounts. The existing authenticated indexes remain. Public fields,
   literal search, forward/backward paging and complete legacy arrays retain
   their existing semantics.
4. Blocking a lazy page download in the compiled frontend left its progress
   indicator and recurring trickle timer running until a later navigation
   succeeded. Router errors now stop that progress state. Real-router tests use
   the actual NProgress implementation and verify no remaining timers after
   failure, normal navigation, or a repeated same-route navigation. The compiled
   Chrome regression blocks the About page download, requires cleanup without
   leaving the current page, then successfully opens Support Us. All API replies
   are synthetic and external requests are blocked. This corrects a timer lifetime
   defect; it is not evidence of a large browser memory reduction.

The Mongo lease is retained for compatibility and recovery under the documented
single-API/exclusive-maintenance contract. A process queue is not a cross-process
fencing mechanism or a transaction across multiple Mongo documents. Concurrent
API processes/maintenance writers remain unsupported and must not overlap during
promotion. An ambiguous write outcome must not be automatically replayed. No
replica-set conversion, permanent lock, forced restart or new state path is used.

## Comparable measurements

Three interleaved baseline/candidate pairs on the same macOS ARM64 host,
Node 24.18.1/npm 12.0.2, a disposable loopback MongoDB 8.0.32 and compiled backend
code. Seeding and HTTP load generation run outside the measured API process.
No production state, external providers, heap cap or forced garbage collection.

Public workload: one warm page, then 60 identical 50-tutor pages at concurrency
four against the same 30,300-account fixture. All response digests match. The
workflow phase then executes three batches of 32 operations, each revalidating a
manager, holding a synthetic 10-ms work interval and completing an account update.
It exercises the real compiled coordinator and database, not a complete browser
interaction. The public phase precedes workflow measurement in both variants.

| Metric (median of three runs) | v2.3.4 baseline | v2.3.5 candidate | Change |
| --- | ---: | ---: | ---: |
| Public query peak API RSS (MiB) | 185.92 | 186.83 | +0.5% |
| Public query p95 (ms) | 21.78 | 4.88 | -77.6% |
| 60 public pages elapsed (ms) | 279.71 | 62.43 | -77.7% |
| Workflow peak API RSS (MiB) | 190.31 | 188.41 | -1.0% |
| Workflow p95 (ms) | 3057.13 | 421.19 | -86.2% |
| 96 workflows elapsed (ms) | 9475.70 | 1304.69 | -86.2% |

Median Mongo acquisition commands for the same 96 successful workflows fell
from **1,584 to 96 (93.9%)**. This is mainly a database-work/latency improvement
and a concurrency correctness fix, not a general reduction in application RSS.
Public idle RSS was 165.42 versus 165.41 MiB. Two-second post-workflow recovery
RSS was 126.38 versus 188.42 MiB; the faster candidate reaches observation earlier
in process lifetime and without the baseline's intervening GC. Do not describe
these short samples as a long-term memory improvement or leak-free result.

The exact artifact gate has been extended from one minute plus five seconds idle
to ten minutes plus 65 seconds idle, with 30-second RSS/high-water samples and a
bounded 1-ms latency histogram. Its longer recovery evidence is recorded in the final runtime report.

## Validation and reproduction

The initial source passed a local clean locked install, full lint/type checks,
65 frontend and 97 backend checks (no skipped tests), builds, production-only
native install and six artifact regressions. Registry verification covered 916
signatures and 282 attestations; shell checks passed. After the additional
navigation correction, another clean install, lint/type checks, all 66 frontend
checks, builds, compiled Chrome recovery and build-security checks passed. The
backend and dependency inputs are unchanged. Both full and production audits
remain zero; the final exact ARM64 source passed the complete suite.

The authorization tests cover expiry, FIFO/overflow, cancelled waiters, failed
operations, release, stale-manager denial, external-owner preservation, real
HTTP read/write disconnects, and slow Mongo duplicate-key replies. The latter
uses an actual foreign lock plus a scoped server delay; it drains the synthetic
in-flight server commands before deleting fixture state. A client timeout alone
is not taken as evidence that Mongo stopped a command.

The retained v2.3.4 compiled application passed complete role directories, assigned
tutor scope, cross-role denial, profile writes and session login/logout against
all candidate indexes. Role/auth-version/assignment state and index inventory
were preserved. This is an additive index, with no record/schema format migration;
rollback to the old application also restores its old concurrency limitation.

```sh
# Use an owned disposable loopback Mongo with enableTestCommands, never production.
TEST_MONGODB_URI=mongodb://127.0.0.1:PORT/operation_security_test_full \
MONGO_FAULT_TEST_URI=mongodb://127.0.0.1:PORT/operation_security_test_control \
  npm test
node scripts/measure-workflow-runtime.mjs RETAINED_CHECKOUT . \
  mongodb://127.0.0.1:PORT/operation_security_test \
  .ai-work/runs/REVIEW/measurements.json 3
node scripts/test-directory-rollback.mjs RETAINED_CHECKOUT \
  mongodb://127.0.0.1:PORT/operation_security_test
# On a host with Chrome, after building the static frontend:
CHROME_BIN=/path/to/chrome node scripts/test-navigation-recovery.mjs
```

Evidence: [raw comparisons](measurements/workflows-2026-09-16.json),
[natural lease expiry](measurements/workflow-lease-2026-09-16.json), and
[retained-application rehearsal](measurements/workflow-rollback-2026-09-16.json).
Follow the [runtime contract](runtime-artifact-contract.md) for exact source,
manifest/native acceptance, existing service/Quotes separation, external state,
startup reconciliation and rollback. Infrastructure, DNS, credentials, production
services and existing release tags were untouched. The broader site/fleet audit
remains active.
