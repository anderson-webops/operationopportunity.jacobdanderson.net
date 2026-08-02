# Operation Opportunity security and backend workflow audit — 2026-08-02

## Scope and disposition

This pass re-audited authentication, sessions, CSRF, user/tutor/admin authorization, administrator promotion and demotion, tutor approval and suspension, destructive actions, concurrent writes, login identity uniqueness, MongoDB and Vault configuration, quote proxying, diagnostics, systemd/Nginx, dependencies, CI, release preparation, promotion, rollback, and the public deployment boundary.

Release `v2.3.0` remediates the source findings below. Source validation and public promotion remain separate gates: `/release.json`, `/api/healthz`, and `/api/readyz` must report the exact same release, commit, and deployment timestamp over both address families, and the public edge must carry the reviewed strict policy.

## Findings remediated

- A manager request was authorized before waiting for the database membership lock. Another manager could revoke that authority while the first request was in flight, after which the stale request could still create an admin, change manager privilege, delete an admin, or promote/demote a tutor. Every privileged controller now reacquires the actor and verifies its current authorization version and manager privilege inside the cross-process lock.
- Tutor assignment could interleave with tutor suspension or deletion, leaving a user assigned to an inactive or deleted tutor. Assignment, assigned-user mutation/read, tutor status transitions, and tutor deletion now share the authorization workflow lock and revalidate current state inside it.
- Concurrent account writes could both increment the same authorization version, silently overwrite one another, and leave stale cross-role email reservations. Account documents now use optimistic concurrency; stale writes return a conflict; manager privilege changes increment authorization versions; deletion removes every registry identity owned by the account.
- Invalid optional sessions were destroyed and then allowed to continue into anonymous signup with no usable session object. Optional authentication now regenerates an empty anonymous session before continuing, while protected routes still fail closed.
- Production configuration accepted ambiguous Mongo/Vault sources, an explicit unauthenticated-loopback Mongo exception, non-loopback trusted proxies, optional public listeners, both session-secret inputs at once, and a remembered lifetime shorter than the normal lifetime. Production now requires exactly one authenticated Mongo secret source, a loopback listener, one or more exact loopback proxies, one unambiguous session-secret source, and ordered session lifetimes.
- The repository still offered a production Dockerfile and an incomplete static-only deployment configuration even though the live application requires its same-origin API. Those paths were removed. The supported path is direct systemd/Nginx only; the Mongo container in CI remains test-only.
- Public inspection found the current `v2.2.0` application artifact on both A and AAAA paths, but the host still returned the older generic CSP with unsafe script allowances and `SAMEORIGIN` framing. Atomic promotion now gates both static and API headers on IPv4 and IPv6 and rolls back if the release source, API, or edge policy drifts.

## Preserved security controls

- Revocable Mongo-backed sessions, production `__Host-` secure cookies, session regeneration, ordered secret rotation, current-password verification for credential changes, and per-account authorization versions.
- Exact-origin plus session-token CSRF protection for every mutation, bounded login/signup/authenticated request rates, no cross-site cookie mode, and no client-authoritative identity.
- Explicit request parsers that reject unknown fields, immutable role fields, pending-by-default tutors, sanitized public tutor records, private account directories, and final-admin/final-manager invariants.
- Loopback-only API, authenticated production MongoDB, TLS for non-loopback Mongo/Vault/quotes traffic, bounded Vault and quote responses, hidden diagnostics, sanitized errors, and privacy-limited structured security events.
- Dedicated system account, exact Node binary, no ambient capabilities, read-only system/release view, restricted namespaces and address families, fail-closed configuration verification, and no production container runtime.

## Validation contract

The release gate requires an exact Node 24.18.1/npm 12.0.2 clean install; full and production-only audits; registry signature verification; lint; TypeScript; front-end and backend tests; Mongo-backed concurrent authorization integration tests; builds; source-map/secret/inline-script checks; isolated production API install and Argon2 verification; accessibility; direct script syntax; GitHub workflow parsing; Linux ARM64 native lock checks; secret scanning; and public exact-identity/header verification after promotion.

The obsolete APILayer credential described in the 2026-07-29 audit is absent from published source refs. Provider-side revocation and usage review remain an external credential-owner verification gate because repository changes cannot revoke a provider token already copied from old history.
