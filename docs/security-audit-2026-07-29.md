# Operation Opportunity security audit — 2026-07-29

## Scope and result

The audit covered authentication, session lifecycle, user/tutor/admin authorization, promotion and demotion, destructive workflows, privacy boundaries, quote-service proxying, MongoDB and Vault access, diagnostics, dependency and build integrity, CI, containers, Nginx, and systemd.

The source boundary is remediated for release `v2.2.0`. Production promotion remains separately verifiable through `/release.json`, `/api/healthz`, and `npm run verify:public`.

## Critical findings remediated

- Unauthenticated `POST /admins` could create an admin and sign the caller in.
- Tutor assignment and tutor-wide user deletion were unauthenticated.
- Any logged-in user or tutor could target another account identifier on several update/delete routes.
- Users, tutors, and admins were created and updated through raw request-body mass assignment.
- User and tutor directories exposed emails, ages, and locations publicly.
- Any admin could overwrite another admin’s credentials or remove the last administrator.
- Tutor self-registration immediately granted access-capable status with no approval/demotion workflow.
- Signed client-side identity cookies could not be centrally revoked and retained multiple stale role identifiers across logins.
- Cross-site cookie mode had no CSRF token, login/signup had no attempt limits, and proxy identity trusted a hop count rather than exact addresses.
- Database diagnostics accepted spoofable forwarding data and exposed topology; readiness returned raw database errors.
- Vault requests lacked timeouts and could silently fall back after a configured Vault failure.
- The quote proxy forwarded arbitrary query keys, had no response-size bound, and returned upstream error bodies.
- CI actions and container base images were mutable; CodeQL monitored the wrong branch; one CI job did not run any tests.
- The container ran root Nginx and the production API had no reviewed systemd/Nginx contract.

## Remediated workflow

| Actor | Allowed workflow |
| --- | --- |
| Anonymous | Read the sanitized active-tutor directory; create one user or pending-tutor account through rate-limited, same-origin CSRF-protected signup |
| User | Read/update/delete self; select an active tutor for self |
| Pending/suspended tutor | Read/update/delete self; no assigned-user access |
| Active tutor | Read assigned users; update only assigned users’ non-credential profile fields |
| Admin | Read private directories; update/delete users; maintain self |
| Admin manager | Create admins, delegate/revoke manager status, approve/suspend/delete tutors, subject to final-admin/final-manager invariants |

Admin membership operations are serialized through a short MongoDB lease so concurrent requests cannot both pass the last-admin checks. Tutor suspension increments the account session version and unassigns users. Email uniqueness is enforced across all three legacy account collections through a unique identity registry backfilled at startup; conflict-free legacy casing and collection roles are normalized before traffic is accepted.

## Runtime and deployment controls

- Node 24.18.0/npm 11.16.0 are aligned across local metadata, CI, and the digest-pinned build image.
- The API listens on loopback by default, accepts exact trusted proxy IPs only, authenticates production MongoDB, and fails closed when configured Vault access fails.
- Sessions are stored in MongoDB with an ordered secret-rotation list, secure `__Host-` cookie, regeneration at login/signup/credential change, and account session-version revocation. The browser does not claim logout success unless server-side destruction is confirmed.
- Every mutation requires exact `PUBLIC_ORIGIN` and a session CSRF token. Login/signup and public/authenticated surfaces have separate rate limits.
- API responses use no-store caching, request IDs, strict API CSP, framing denial, bounded parsers/timeouts, and sanitized errors.
- The static image uses digest-pinned unprivileged Nginx on port 8080 with a strict no-inline-script CSP. `/api` can never fall through to the SPA.
- The systemd service has a dedicated account, no capabilities, a read-only system view, restricted namespaces/address families, and configuration verification before start. Non-loopback MongoDB traffic must use TLS.
- GitHub Actions are commit-SHA pinned with read-only defaults; CodeQL targets `main` with extended security queries.

## Validation

- Clean root install, authoritative/standalone lockfile parity, and an isolated production-only API install with a working native Argon2 binding.
- Full and production-only dependency audits.
- Front-end unit/component workflow tests and backend authorization/config/CSRF/proxy/deployment tests.
- Lint, TypeScript, front-end and runtime-only backend builds.
- Build-secret/source-map/inline-script checks.
- Linux ARM64 optional native package lock checks.
- Tracked working-tree and full-history secret scans.

## External credential incident

The audit found a 32-character APILayer key in an obsolete historical `script.js` commit. A single read-only provider request confirmed the key remained active on 2026-07-29. The obsolete path is purged from all published Git refs as part of this release, but history rewriting cannot revoke copies already cloned or cached. The APILayer account owner must revoke/rotate that key in the provider dashboard and review its usage records. The application no longer calls APILayer and no replacement key belongs in this repository.

## Live boundary at audit time

The IPv4 static site remained reachable, but it served the pre-remediation SSG build instead of release `v2.2.0`: `/release.json` fell through to old SPA HTML and the response retained the prior inline/eval-capable CSP. The IPv4 API health endpoint and both tested IPv6 endpoints timed out. Host access was unavailable, so no production promotion is claimed. Source release, CI runner execution, host promotion, database backup, one-time manager recovery, APILayer revocation, and public verification remain distinct gates.
