# Health checks

Use only these endpoints for monitoring:

- `GET /api/healthz` is dependency-free liveness and returns `ok`, `release`, `commit`, and `deployedAt`.
- `GET /api/readyz` returns `200` only when MongoDB is connected and pingable; it returns `503` without raw database errors otherwise.
- `GET /release.json` identifies the static front-end artifact.

All health responses are `Cache-Control: no-store`. Production monitoring must require release `v2.2.0` and the expected commit on both the static and API surfaces. `/_dbinfo` is not a monitoring endpoint and is hidden unless diagnostics are explicitly enabled with a strong separate key.
