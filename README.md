# Operation Opportunity

Operation Opportunity is a Vite/Vue front end with a same-origin Express/MongoDB API.

## Security model

- Users may create, update, delete, and assign a tutor only for themselves.
- Tutors begin in `pending`; an admin manager must approve them before they appear publicly or can access assigned users.
- Active tutors may read and update non-credential profile fields only for users assigned to them.
- Admins may review users and tutors. Only admins with `editAdmins` may approve/suspend tutors, create peer admins, delegate/revoke admin-management privilege, or delete tutors.
- Admin credentials are self-managed. Managers cannot overwrite another admin’s email or password.
- The final admin and final admin manager cannot be removed or demoted.
- Role fields are immutable; the API has no cross-role mass-assignment path.
- Administrator membership and tutor relationship changes are serialized across processes and revalidate the actor after acquiring the workflow lock.
- Manager grants/revocations and credential changes increment the account authorization version, revoking every other session immediately.
- Optimistic account writes reject stale concurrent changes instead of silently overwriting security state.

Authentication uses revocable Mongo-backed sessions, an HTTPS `__Host-` cookie in production, exact trusted proxies, and a session-bound CSRF token plus exact-origin validation for every mutation.

Production has one supported path: static assets served by Nginx and the loopback-only Node API run by systemd. The repository intentionally has no production container or static-only hosting configuration.

## Commands

```bash
npm ci
npm run verify:deploy
npm run verify:api-production-install
npm run dev
npm run server
npm run verify:public -- https://operationopportunity.jacobdanderson.net
```

The root `package-lock.json` is authoritative; `back-end/package-lock.json` and `back-end/.npmrc` are kept synchronized for isolated API recovery and are verified through a clean production-only install. Atomic direct preparation, promotion, public edge verification, and rollback are documented in [`deploy/systemd/README.md`](deploy/systemd/README.md).

## Quotes integration

The browser requests `/api/quotes?tags=success&random=true&limit=1`. The home page
renders its built-in quote immediately, replaces it with validated API text, and
cancels pending work after ten seconds or when navigating away. The quote uses a
compact, neutral treatment based on the original view, with no promotional label,
gradient, or shadow.

The same-origin proxy uses `QUOTES_UPSTREAM_SOCKET_PATH` first when configured
(normally `/run/quotes/quotes.sock`), then `QUOTES_UPSTREAM_URL`
(default `https://jacobdanderson.net/quotes-api`). The HTTP base may include
`/quotes-api` or the full `/quotes-api/quotes` path. Request filters override URL
defaults without duplicate query parameters. Browser cookies and credentials are
never forwarded upstream.

Socket requests have a two-second total deadline; HTTP fallback has five seconds.
Both transports bound response bodies to 1 MiB. Connection failures, upstream
service errors, invalid JSON, and unusable payloads trigger one HTTP fallback.
Upstream validation errors and rate limits are returned without retrying; numeric
`Retry-After` values are preserved. Responses use `Cache-Control: no-store`.
An empty collection is a valid `200 []` result and leaves the browser fallback in place.
Invalid supported filters return `400 invalid_quote_query`; unknown query keys are
not forwarded. Both failed transports return only `502 quotes_unavailable`.

`npm test` covers the client lifecycle, socket/HTTP transports, query boundaries,
rate limits, malformed responses, and cancellation. `npm run verify:public` checks
that the deployed proxy supplies a usable success quote and that the static and
API release identities match exactly. It is a post-deployment verifier; health
probes remain minimal and independent of the optional quote service.
