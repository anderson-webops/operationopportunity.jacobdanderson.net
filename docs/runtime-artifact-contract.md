# Operation Opportunity runtime artifact contract

Build source, package acceptance, source release and production activation are
separate gates. `scripts/build-arm64-release.sh OUTPUT` runs on an unprivileged
Linux ARM64 builder with Node 24.18.1/npm 12.0.2, MongoDB 8 fixture binaries,
Python 3 and bubblewrap. OUTPUT must be under the owning checkout's ignored
`.ai-work/runs/`. Both `TEST_MONGODB_URI` and `MONGO_FAULT_TEST_URI` must identify
owned synthetic loopback databases; the fault fixture requires test commands.
No production connection or provider secret is used.

The builder runs clean locked installation, lint, types, frontend/backend tests,
compiled builds, build-security/native-install verification, full/production
audits and registry signatures. Browser binary downloads are skipped in this
artifact gate; frontend unit tests still run. No frontend visual change is part
of this milestone. Source and backend standalone locks must both pass.

## Completeness and isolated execution

`deploy/runtime-artifact.json` independently enumerates compiled server and
maintenance entrypoints, runtime modules, production dependency metadata, native
Argon2 binding and static frontend assets. This application has no generated
client or shared runtime module outside `dist`; these are explicitly empty.
Every packaged file has a size and SHA-256 in `runtime-manifest.json`, also emitted
as a sidecar. Backend dependency versions must match its standalone lock;
development tools, source trees, symlinks, credentials and mutable state fail
verification. Static release identity must match the full source commit.

Use the trusted archive digest and full revision from the reviewed release:

```sh
python3 -B scripts/runtime-artifact.py unpack EMPTY_TREE --archive ARCHIVE --sha256 SHA256 --commit FULL_COMMIT
python3 -B scripts/runtime-artifact.py verify COPIED_TREE --archive ARCHIVE --sha256 SHA256 --commit FULL_COMMIT
```

The second command must run on the actual tree **after a deployment copier**.
An incomplete tree cannot pass by deleting the omitted file from its manifest.
A missing compiled `runtimeCapacity.js` is rejected independently and also tested
by starting the broken service. There is no artificial `shared/` directory.

The unpacked acceptance runner uses a read-only artifact, unprivileged process,
zero effective capabilities, isolated loopback network and disposable state.
The disposable fixture state is disk-backed. A separate tmpfs probe requires
the compiled server to reject RAM-backed identity scratch before listening.
Neither source checkout nor development modules nor real providers are visible.
Missing isolation support fails; do not fall back to running in the checkout.
It executes the real native binding and compiled API, checks maintenance CLI
imports/fail-closed configuration guards, minimal GET/HEAD probes, static/API
identity, signup/login/logout, CSRF and role denial, provider/database failures,
recovery, a sustained authenticated-read workload and a disconnected accepted
update that must drain and audit under repeated signals. Restart must retain the
account and session. The CLI guard checks do not claim interactive operator
recovery workflows were performed. Existing integration tests cover their shared
account/authorization logic; operator recovery remains privileged.
Startup acceptance also stops the compiled service during a blocked identity
cursor and checks exit 0, private-index permissions and complete scratch cleanup.

Publish archive, checksum, manifest, acceptance receipt and acceptance records
only after all gates pass for the exact annotated source. The receipt binds the
archive to hashes of every test/verification file. Leftover files from a failed
builder are not publishable. Keep existing tags/assets immutable.

## Operator compatibility and rollback

The existing documented topology is `/srv/operation-opportunity/current` with
`back-end/dist/server.js`, production modules under `back-end/node_modules`, static
`front-end/dist`, `operation-opportunity-api.service` and loopback 3002. Preserve
actual installed paths/users/listeners if the operator's reviewed host differs.
Use the already installed Node 24.18.1 prefix in the service; do not replace
host-wide `/usr/bin/node` to satisfy a template. npm is build tooling, not the
production service entrypoint. Do not install a canonical template over an
existing compatibility host.

The existing `prepare-release.sh`/`promote-release.sh` scripts expect a source
checkout and their preparation marker. An unpacked runtime archive is a different
input contract. **Do not feed it to those scripts or forge that marker.** The
operator's artifact adapter must verify the archive and copied tree, preserve
existing protected environment/release files, atomically switch the reviewed
pointer, restart only this API, and check readiness and exact API/static identity.
Keep the previous immutable artifact for rollback. No source build is required
on the Pi once that adapter is reviewed. No production deployment or host-adapter
migration was performed by this source task.

Accounts, sessions, unique login identities and authorization locks remain in the
existing authenticated external MongoDB. There is no application email spool or
upload tree in this service. Never copy database/session state from a release,
clear sessions to reduce memory, or remove authorization/version fields during
rollback. Journals remain service-managed and temporary files use private OS
storage. Preserve the separate Quotes API and its socket group boundary. Preserve
Nginx, TLS and both address families.

This milestone changes no schema. For future schema changes, rehearse candidate
and exact retained application reads/writes and sessions against the migrated
synthetic database before activation. Application rollback does not reverse a
migration. Database restoration requires a separately reviewed operation.

## Private startup identity scratch

Startup scans every account with 128-row cursors and preserves JavaScript Unicode
email normalization. A private SQLite index detects duplicates across all roles
before account or identity-registry repairs. Its page cache is two MiB; the index
itself grows on disk with account count. Already-correct registry entries are not
rewritten. Node's built-in `node:sqlite` is part of the pinned runtime, not an
additional npm/native package. Extension loading and memory mapping are disabled.

On Linux, the index uses `TMPDIR` if supplied, otherwise `/var/tmp`; it rejects
tmpfs and ramfs. The operator must verify that the service's existing private
temporary namespace exposes a writable, disk-backed location outside immutable
releases with enough free space. Preserve its existing isolation and permissions;
do not change the host template or put scratch under the release to bypass this
check. The directory is private (0700), its database is 0600, and both contain
sensitive account identifiers. No index, journal or identifier belongs in an
artifact, public log, report or backup of an immutable release.

Completion, ordinary failure and cooperative startup cancellation remove this
scratch. An uncatchable process/host failure can leave it until the service's
private temporary namespace is retired; operators must retain private ownership
and perform reviewed cleanup, never treat it as authoritative data. Disk failures
fail startup closed. Repairs remain restartable, but they are not a single
transaction across account collections: maintain the existing exclusive startup
or maintenance boundary with no concurrent account writers. Do not run a recovery
CLI concurrently with a serving API or a second reconciler. This change does not
claim to solve distributed startup or authorization-lease coordination.

Preserve the actual database and retained application through promotion and
rollback. The old application does not need this disposable index; no new durable
schema or identity semantics are introduced.
