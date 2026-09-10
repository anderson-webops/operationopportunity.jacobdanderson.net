# Site and Quotes API audit, 2026-09-10

Scope: Operation Opportunity at baseline `3606764`, emphasizing its same-origin
Quotes API integration, with a small visual adjustment requested during review.
The sibling Quotes API source and contract were inspected read-only. No production
configuration, database, or Quotes API source was changed.

## Findings and changes

| Finding | Resolution |
| --- | --- |
| The home page fetched up to 100 records but always displayed the first. | Request one random `success` quote using the service's existing `random=true&limit=1` contract. |
| The quote area stayed empty during a slow request and trusted unchecked runtime fields. | Render the local fallback immediately, accept only bounded nonblank text and author strings, and ignore malformed/late results. Cancel on navigation and after ten seconds. |
| Socket fallback covered connection errors but not service errors or malformed data. Its inactivity timer could be kept alive by streaming bytes. | Use a two-second total socket deadline and five-second HTTP deadline, recover once via HTTPS, limit both bodies to 1 MiB, and cancel upstream work when the caller disconnects. |
| Empty results and upstream rate limits were both converted to generic gateway failures. | Preserve valid empty collections, return bounded 400/429 errors, preserve numeric Retry-After, and never retry upstream validation or rate-limit responses, even with broken error bodies. |
| Query defaults could produce duplicate parameters, while malformed supported filters were silently ignored. | Replace URL defaults with validated request values. Reject ambiguous, repeated, oversized, or invalid supported filters before contacting upstream. Continue excluding unknown keys and browser credentials. |
| Promotion still required release fields and `ready:true` in probes after probes had changed to `{ok:true}`. | Add the separate no-store `/api/release.json` endpoint. Check minimal probes and exact API/static identity separately over loopback and both public address families. Public verification also exercises the quote proxy. |
| Dependency audits reported four moderate affected-package entries. | Patch Vitest to 4.1.11 and qs to 6.16.0 in both install paths. Keep unrelated framework upgrades outside this change. |
| The favicon had an invalid path and MIME type; production builds sent analytics from local previews. | Serve the existing icon from the public directory, correct its type, and restrict analytics to the production hostname. |

The quote presentation follows the earlier plain gray quote block: ordinary-size
italic text, a small author line, and compact spacing. It has no heading, gradient,
shadow, or oversized decorative quotation mark. Other page styling is unchanged.

## Verification

Local verification used the deployment-pinned Node 24.18.1 and npm 12.0.2:

- Root `npm ci` succeeded. Root production/development and standalone API audits reported zero advisories.
- `npm run verify:deploy` passed: formatting, lint, type checks, 47 frontend tests, 63 backend tests, both production builds, build-security checks, and isolated production-only API installation with a working Argon2 binding.
- MongoDB authorization integration tests used a newly created local disposable database, with no skipped tests.
- Registry verification checked 916 package signatures and 282 available attestations.
- Four Cypress tests passed, including navigation, the exact random-quote request, API text rendering, and fallback rendering.
- Accessibility checks passed on home, about, profile, signup, and support pages in both light and dark modes.
- ShellCheck and Bash syntax checks passed for the promotion script. Executable deployment-response tests reject failed/expanded probes, missing identities, truncated commits, and stale release metadata.
- Desktop (1440px) and mobile (390px) views were inspected. The final browser run had no console errors or warnings. The favicon returned the original icon bytes.
- Both public quote endpoints returned HTTP 200 during the initial read-only check. The revised local proxy also fetched and displayed quotes from the public Quotes API. This verifies connectivity at the time of the audit, not deployment of this release.

## Rollout boundary

Release `v2.3.1` is a new patch milestone for quote reliability and corrected
promotion verification. Prepare and promote its static assets and API together
using the documented systemd workflow, then run public verification with the full
commit. No database migration or Quotes API release is needed.

Production host promotion and live identity verification were not performed in
this audit. Older API builds lacking `/api/release.json` cannot pass the new
identity gate. Automatic rollback still restores the previous symlink and release
environment, but reports failed verification if that older API cannot identify
itself. Do not interpret that restoration as a verified deployment.

## Reference contracts

- The current Quotes API contract is documented in the sibling project's `README.md` and implemented by `src/validation.ts`.
- [Node HTTP request cancellation](https://nodejs.org/docs/latest-v24.x/api/http.html#httprequestoptions-callback) distinguishes socket timeout events from aborting a request.
- [Vitest's advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9) identifies 4.1.11 as a patched release.
- [qs advisory](https://github.com/ljharb/qs/security/advisories/GHSA-4mjr-xmp4-gh2g) documents the affected parser behavior.
- [Umami tracker configuration](https://docs.umami.is/docs/tracker-configuration#data-domains) documents hostname restrictions for development and staging.
