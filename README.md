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

Authentication uses revocable Mongo-backed sessions, an HTTPS `__Host-` cookie in production, exact trusted proxies, and a session-bound CSRF token plus exact-origin validation for every mutation.

## Commands

```bash
npm ci
npm run verify:deploy
npm run verify:api-production-install
npm run dev
npm run server
npm run verify:public -- https://operationopportunity.jacobdanderson.net
```

The root `package-lock.json` is authoritative; `back-end/package-lock.json` and `back-end/.npmrc` are kept synchronized for isolated API recovery and are verified through a clean production-only install. Production rollout and rollback are documented in [`deploy/systemd/README.md`](deploy/systemd/README.md).
