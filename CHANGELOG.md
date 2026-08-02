# Changelog

All notable release tags for Operation Opportunity are recorded here.

## v2.3.0

- Revalidated administrator authority inside a cross-process authorization lock so a demoted or credential-revoked manager cannot complete an already in-flight privileged request.
- Serialized tutor approval, suspension, deletion, assignment, and assigned-user updates to prevent dangling or post-demotion relationships.
- Added optimistic account writes, privilege-change session revocation, and complete identity-registry cleanup for concurrent credential and deletion workflows.
- Tightened production configuration to one authenticated MongoDB secret source, loopback-only listeners and trusted proxies, unambiguous session-secret rotation, and ordered session lifetimes.
- Updated the lint, browser automation, Qodana, and CodeQL toolchains while retaining Node 24 typings and TypeScript 6 until their upstream compatibility ranges permit the next major versions.
- Removed the production Docker and incomplete static-only deployment paths in favor of atomic systemd/Nginx preparation, promotion, edge verification, and rollback.
- Added release-tag and post-deployment verification workflows for the direct runtime, including explicit npm 12 installation because Node 24 bundles npm 11.

## v2.1.2

- Removed the deprecated `@intlify/unplugin-vue-i18n` plugin path that was pulling in `vue-i18n@10.0.8`.
- Switched locale loading to raw YAML imports parsed by the `yaml` package while preserving the existing locale files.
- Refreshed the root lockfile so fresh `npm ci` installs no longer emit the `vue-i18n@10.0.8` deprecation warning.

## v2.1.1

- Removed the unsupported PWA build integration to eliminate the remaining frontend audit vulnerabilities.
- Refreshed the root lockfile onto patched transitive dependency versions.
- Added a standalone backend `package-lock.json` so server-side backend installs resolve reproducibly and audit cleanly.

## v2.1.0

- Switched the backend quotes proxy to the self-hosted Quotes API.
- Added Unix-socket-first upstream support with HTTPS fallback for the quotes service.
- Documented quotes upstream environment variables and backend validation paths.
- Removed legacy AudioT branding and updated stale public repository links.

## v2.0.0

- Modernized the frontend stack around the current Vite and Vue 3 application structure.
- Cleaned up configuration for the active build and dependency workflow.

## v1.1.0

- Improved and refreshed the automated tests.
- Updated and optimized project dependencies.

## v1.0.0-vue3

- Landed the Vue 3 and Express application milestone.
- Enabled sign-up, logout, and account management flows.

## v1.0.0

- Established the first runnable baseline for the site.
