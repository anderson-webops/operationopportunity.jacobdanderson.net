# Directory and session lifetime audit, 2026-09-16

Published: v2.3.4 / 9ade7e3ca2af127f0c19398ffcf3fe637920cc16. Baseline: v2.3.3 application, retained checkout
fc61b773ab158d4d847c9cdb38c3d24aebe4988c (documentation after tagged application
d76675e40e4fe610d03857bcfba6da00792ac296). Exact Linux ARM64 package acceptance and publication are verified in the
[directory runtime report](directory-runtime-acceptance-2026-09-16.md). No production change.

## Result and tradeoff

Bounded, searchable directories replace loading all accounts into global frontend
arrays. Legacy array consumers retain complete results with a backpressured
cursor. Session generations cancel abandoned reads and suppress obsolete results;
view-local drafts survive refresh failures and edits made during earlier saves.
The [API and rollout contract](directory-contract.md) describes the full behavior.

Three alternating paired runs use 4,501 synthetic accounts on the same macOS ARM64
host, Node 24.18.1 and Chrome 152.0.7977.83. The [raw record](measurements/directories-2026-09-16.json)
includes compiled input and lockfile hashes, timings and memory samples. Candidate
inputs were hashed before its source commit; release identity files will be
regenerated for the exact Linux release. No raw personal or production data is used.

| Measurement, median of three | Baseline | Candidate | Change |
| --- | ---: | ---: | ---: |
| Complete legacy request peak API RSS (MiB) | 335.12 | 227.34 | -32.2% |
| Complete legacy request p95 (ms) | 49.63 | 62.36 | +25.7% |
| Complete legacy batch duration (ms) | 240.08 | 279.26 | +16.3% |
| Directory first-render peak browser JS heap (MiB) | 32.48 | 5.54 | -82.9% |
| Directory first-render peak API RSS (MiB) | 337.55 | 228.69 | -32.3% |
| Directory first-render duration incl. network-idle wait (ms) | 979.97 | 573.99 | -41.4% |
| Browser JS heap after view removal and two seconds (MiB) | 39.18 | 5.88 | -85.0% |

The legacy API workload is identical: warm each of three role directories, then
five groups of three simultaneous complete-array requests. Every role count and
canonical full-payload digest agrees. This reduces measured peak API memory with
a latency cost; it is not a universal speed improvement.

The UI comparison intentionally changes initial work: the old admin page loads
4,501 directory records plus its own card; the candidate loads 50 per role plus
its own card (4,502 versus 151 rendered cards). Search and next/previous navigation
retain access to later records. Complete paginated traversal is independently
tested, including equal names, rather than inferring completeness from fewer cards.
The API's UI-phase samples follow the matched legacy warm/load phase; they are not
fresh-process idle figures. Browser numbers are JavaScript heap, not total Chrome
process RSS. Measurements poll the API every 20 ms and browser every 100 ms, with
no forced GC, heap caps, special restarts or real provider calls.

Recovery observations are only two seconds and retained process memory stays
above earlier levels. The measurements do not establish long-term leak freedom.
The previous shorter benchmark runs are diagnostic only; the linked six-run
record supersedes them. Startup, long-duration soak and distributed authorization
lease work remain separate requirements of the wider audit.

## Validation

- Root clean locked install, lint, type checks and compiled builds passed.
- 65 frontend and 87 backend tests passed with no skips. They cover complete
  traversal, literal search, authorization/private-field boundaries, index plans,
  cursor backpressure/disconnection, cancelled lock waits, stale responses/CSRF,
  newer edits during a save and failed signup draft preservation.
- Real compiled-browser checks passed for paging, late-row search, saving while
  typing, cancelled route/logout departure and removal of private cards after
  confirmed logout. No page runtime errors occurred. A delayed tutor lookup cannot
  overwrite a newer selection, and privilege loss clears hidden admin credentials.
- Twelve repeated component mount/navigation/disposal cycles remove each unload
  listener and return the unsaved-view count to zero. This is bounded lifecycle
  evidence, not a substitute for a long browser soak.
- The retained compiled v2.3.3 API passed reads, writes, sessions and tutor scope
  against the candidate's actual new indexes. Its [receipt](measurements/directory-rollback-2026-09-16.json)
  confirms that all indexes and identity/authorization/assignment fields survive.
- Full and production vulnerability audits reported zero; 916 registry signatures
  and 282 attestations verified. The independent standalone production install and
  native password operation passed. Six packaging regressions passed, including
  omission of the new compiled directory module.

The isolated ARM64 runner now includes complete paged/legacy directory comparisons,
late search and public/private authorization checks. Its exact-source acceptance passed before publication; the runtime report links
the verified archive, receipt and published files.

## Reproduction and deployment boundary

Use scripts/measure-directory-runtime.mjs with the retained compiled checkout,
current compiled checkout, an owned loopback operation_security_test Mongo URI,
a repository-local .ai-work/runs output directory, and three pairs. The runner
starts compiled APIs and static UI fixtures, allows browser requests only to its
local origin, uses no real provider messages, and cleans child processes and
synthetic databases. scripts/test-directory-rollback.mjs reproduces the retained
application check separately. All normal application checks remain required.

Preserve the installed API/static paths, service user/runtime prefix, MongoDB
and sessions, separate Quotes service, protected configuration and dual-stack
Nginx edge. Review additive index creation before activation; never drop indexes
or overwrite records to save memory. The runtime artifact still requires the
operator's reviewed copier/atomic-promotion adapter and exact retained rollback.
No live deployment, credentials, DNS or host configuration were accessed here.
