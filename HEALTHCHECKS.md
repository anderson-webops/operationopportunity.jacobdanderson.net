# Health checks

Use only these endpoints for monitoring. They are unauthenticated, never
redirect, never set cookies, and always return `Cache-Control: no-store`.

- `GET /api/healthz` returns `200 {"ok":true}`; `HEAD` returns the same status with no body.
- `GET /api/readyz` returns `200 {"ok":true}` only when MongoDB is connected and pingable.
- Unavailable storage returns `503 {"ok":false}`; `HEAD` performs the same check with no body.
- `GET /release.json` identifies the static front-end artifact.

The probes expose no secrets, database names, host details, process metrics,
environment information, or component diagnostics. Release identity remains on
`/release.json`; `/_dbinfo` is not a monitoring endpoint and is hidden unless
diagnostics are explicitly enabled with a strong separate key.
