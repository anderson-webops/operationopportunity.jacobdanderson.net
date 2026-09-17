# Operation Opportunity memory-efficiency source review, 2026-09-16

This review consolidates the source work through the v2.3.5 release. It does
not claim production activation or indefinite leak freedom. Exact release and
artifact acceptance are recorded separately in the workflow runtime report.

| Goal area | Source and verification | Result / boundary |
| --- | --- | --- |
| Compiled production processes | Backend `dist/server.js`; maintenance commands compile into `dist`. Manifest and sterile ARM64 acceptance execute the real server and fail-closed CLI imports. | No TypeScript loader or watcher in the production artifact. One API remains separate from Quotes. No background job worker belongs to this site. |
| Admission, native work and caches | `runtimeCapacity.ts`, `passwordWork.ts`, `boundedRateStore.ts`, `serviceLog.ts`, their regressions and compiled drain tests. | 64 active requests, 256 connections, two Argon2 operations and 32 waiters without reducing hash cost. Per-identity rate state caps at 10,000 keys plus a strict overflow bucket. Logs stop admission at 64 KiB and reject a 1 MiB producer overrun. |
| Database and authorization | `databaseCapacity.ts`, `workflowCapacity.ts`, `adminWorkflow.ts`; real Mongo expiry/failure/disconnect tests. | Pool max20, min0, maxConnecting2, idle60s, queue1s, operation5s. Authorization has one owner, 32 waiters and a total five-second admission deadline. Accepted mutations retain drain ownership after disconnect. Single API and exclusive maintenance remain required. |
| Full data and startup | `identityRegistry.ts`, private SQLite `identityIndex.ts`, `directory.ts`; complete semantic digests and retained-application rehearsals. | Full identity scan uses 128-row cursors and a 2 MiB disk-backed index cache. Current UI keeps 50-row pages; legacy arrays remain complete through bounded cursors/backpressure. Account/role/session semantics are preserved. |
| Provider and response bounds | `quoteProxy.ts`, `vaultClient.ts`, parser limits and provider failure tests. | Quotes limit response buffering to 1 MiB and use real cancellation with 2s socket/5s HTTP deadlines. Vault uses 64 KiB/5s. JSON input defaults to64 KiB with a validated 1 MiB maximum. No real provider message is used in acceptance. |
| Frontend session, drafts and timers | API epoch/abort handling, `useDirectory`, `useUnsavedChanges`, keyed profiles, draft regression suite, compiled directory/save/logout checks, Home abort and navigation recovery tests. | Views release directory state and listeners; obsolete reads cannot hydrate another identity. Unsaved text is retained on failed saves/refresh and guarded on leave/logout. Failed lazy navigation now clears NProgress and its timer. |
| IDE/game/grapher execution | Reviewed six page routes and browser/server entrypoints. | Not applicable: this tutoring directory has no user-code runner, game search or grapher execution endpoint. Preserve normal authentication/password work within its explicit bounds. |
| Static/prerender evaluation | Vite `front-end/dist`, HTML metadata and lazy routes; build-security and compiled browser checks. | Already statically hosted: no resident frontend Node process to remove. Public Home/About/Support Us content may be prerendered for a separate SEO improvement, but this audit leaves rendering and metadata intact. Profile/signup and the live quote remain dynamic in the browser. No new SSR server or artificial static health service. |
| Artifacts and rollback | `deploy/runtime-artifact.json`, independent copied-tree checks and isolated Linux ARM64 runtime. | Locks, modules, native bindings and static files are explicit. Keep protected environment, authenticated MongoDB/session data and private disk-backed temporary storage outside the artifact. Exact retained v2.3.4 works with the additive tutor index. |
| Measurements and recovery | Capacity, identity, directory and workflow reports plus long server/browser traces. | Improvements and regressions are reported per workload. Native password concurrency trades throughput for memory; legacy streaming has a latency cost. Normal API RSS is not generally reduced. Finite traces do not establish long-term leak freedom. |

The dormant Vitesse `stores/user.ts` previous-names Set has no production callers
and does not appear in the built JavaScript. It was not treated as an active cache
or altered to claim a runtime improvement.

The repeated-navigation check performed 60 Home/About/Support Us cycles plus a
final leave, with a stalled synthetic quote on each Home visit. Each version
cancelled 61 requests, held at most one quote request, ended with zero pending
requests and 78 JavaScript event listeners after 15 seconds idle. No forced GC
was used. Sampled peak JS heap was 5.79 MiB before the navigation correction and
5.32 MiB after; these are one matched finite trace each, not evidence of a reliable
memory reduction. The relevant failure regression independently demonstrates the
stuck progress indicator before the fix and cleanup afterward.

Historical reports intentionally preserve their then-open items. The later
identity, directory and workflow reports supersede those particular source
questions. Production observation and operator promotion are separate, and the
full Sites audit remains active.
