# Operation Opportunity API deployment

The reviewed production boundary is:

- the public TLS proxy serves the static front end and forwards only `/api/` to `127.0.0.1:3002`;
- the API listens on loopback, trusts only the exact local proxy addresses, and stores sessions in authenticated MongoDB;
- the Quotes API is reached through the read-only `/run/quotes/quotes.sock` group boundary, with HTTPS as a bounded fallback;
- the API service runs as the dedicated `operation-opportunity` account with no ambient capabilities and a read-only system view.

## First v2.2 rollout

1. Back up the `opportunity` database and confirm a restore command before changing the service.
2. Install Node 24.18.0/npm 11.16.0 and run `npm ci`, `npm run verify:deploy`, and `npm run -w back-end build` from the release checkout. The root lockfile is the normal deployment source of truth. For an API-only recovery artifact copied outside the monorepo, copy `back-end/package.json`, `back-end/package-lock.json`, and `back-end/.npmrc` together, then run `npm ci --omit=dev` in that standalone directory. Never install from the API manifest without its reviewed lockfile and lifecycle policy.
3. Stop the old API. Copy `api.env.example` to `/etc/operation-opportunity/api.env`, replace every placeholder, and set owner `root:operation-opportunity` with mode `0640`.
4. Run `npm run -w back-end create-admin` only if the database has no admins. If existing admins predate v2.2 and none has admin-management privilege, run the one-time `npm run -w back-end recover-admin-manager`; it refuses to run once any manager exists.
5. Start the new service. Startup initializes missing account session versions to `0`, treats legacy tutors as active, restores each collection’s canonical role, normalizes conflict-free legacy email casing, and backfills a unique cross-role login registry. Startup fails before serving traffic if old data contains the same normalized email in multiple accounts.
6. Install `operation-opportunity-api.service`, run `systemd-analyze verify`, reload systemd, and enable/restart the service.
7. Include the reviewed Nginx location file, test the complete Nginx configuration, and reload it.
8. Build the static artifact with the same full commit and deployment timestamp used in `api.env`: set `SOURCE_REVISION` and `OPPORTUNITY_DEPLOYED_AT` for `npm run -w front-end build`, or pass them as `SOURCE_REVISION` and `OPPORTUNITY_DEPLOYED_AT` Docker build arguments. A direct Git-checkout build derives a full commit and current UTC timestamp when they are omitted; a build outside Git without valid explicit identity fails. Never promote an artifact whose `release.json` identity differs from the API.
9. Verify `/release.json`, `/api/healthz`, and `/api/readyz` report release `v2.2.0`, the same deployed commit, and a deployment timestamp. Run `npm run verify:public -- https://operationopportunity.jacobdanderson.net <full-commit>` and then exercise anonymous signup, pending tutor approval, user tutor selection, tutor suspension, admin-manager delegation, and last-manager rejection.

## Rollback

The new collections and fields, normalized emails, and canonical collection roles are backward compatible. Stop v2.2, restore the previous source release and service definition, and restart. Do not delete the `sessions`, `accountemails`, or security fields during an emergency rollback. If data restoration is required, restore the pre-rollout backup as a separate, explicitly approved operation.
