# Operation Opportunity direct deployment

The only reviewed production boundary is:

- the public TLS Nginx server serves `/srv/operation-opportunity/current/front-end/dist` and forwards only `/api/` to `127.0.0.1:3002`;
- the API runs directly under systemd as `operation-opportunity`, accepts only exact loopback proxies, and stores sessions in authenticated MongoDB;
- the Quotes API is reached through the read-only `/run/quotes/quotes.sock` group boundary, with a bounded HTTPS fallback;
- each release is prepared in `/srv/operation-opportunity/releases`, atomically selected by the `current` symlink, and promoted only when API readiness, exact release identity, strict edge headers, and both local IPv4 and IPv6 TLS paths pass.

There is no production Docker or static-only hosting path.

## First v2.3 rollout

1. Back up the `opportunity` database and confirm a restore command before changing the service.
2. Install Node 24.18.1/npm 12.0.2 at `/usr/bin/node` and `/usr/bin/npm`. Create the unprivileged `operation-opportunity` account and its `quotes` supplementary group.
3. Run `sudo deploy/systemd/install-api-unit.sh`. Replace every placeholder in `/etc/operation-opportunity/api.env`; keep it owned by `root:operation-opportunity` with mode `0640`. Configure exactly one authenticated Mongo source: `MONGODB_URI`, or the complete Vault AppRole settings, never both.
4. In the existing public TLS server block, set the static root to `/srv/operation-opportunity/current/front-end/dist` and include both files from the current release:

   ```nginx
   root /srv/operation-opportunity/current/front-end/dist;
   index index.html;
   include /srv/operation-opportunity/current/deploy/nginx/operation-opportunity-api.location.conf;
   include /srv/operation-opportunity/current/deploy/nginx/operation-opportunity-static.locations.conf;
   ```

   Remove any competing broad `location /` or generic response-header override for this host. Test the complete Nginx configuration before reloading it.
5. Check out the annotated release tag beneath `/srv/operation-opportunity/releases` as the unprivileged deployment user. Run `deploy/systemd/prepare-release.sh <candidate>`. The script requires a clean checkout and the exact Node/npm toolchain; it performs clean installs, audits, lint, type checks, all tests, builds, static/production checks, accessibility checks, and a production Argon2 runtime smoke.
6. Run `sudo deploy/systemd/promote-release.sh <candidate>`. The script writes non-secret API release identity separately to `/etc/operation-opportunity/release.env`, switches the symlink atomically, validates Nginx, restarts the API, reloads Nginx, and verifies exact static/API identity plus strict headers over both local address families.
7. If any readiness, identity, or edge-policy check fails, promotion restores the prior release and release environment automatically. To roll back intentionally, run the same promotion command with a previously prepared release directory.
8. Run `npm run verify:public -- https://operationopportunity.jacobdanderson.net <full-commit>` from an external network. Then exercise anonymous signup, pending tutor approval, user tutor selection, tutor suspension, admin-manager delegation/revocation, concurrent demotion rejection, and final-manager rejection.

Startup initializes missing account authorization versions, treats legacy tutors as active, restores canonical collection roles, normalizes conflict-free legacy email casing, and backfills the unique cross-role login registry. Startup fails before traffic if old data contains the same normalized email in multiple accounts.

## Recovery notes

The v2.3 schema changes are additive. Do not delete `sessions`, `accountemails`, `adminworkflowlocks`, authorization versions, or optimistic concurrency fields during an emergency rollback. If database restoration is required, restore the pre-rollout backup as a separate, explicitly approved operation.
