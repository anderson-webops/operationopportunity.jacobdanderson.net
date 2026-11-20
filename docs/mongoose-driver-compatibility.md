# Mongoose driver compatibility

The workspace and standalone backend lockfiles must both select
[MongoDB 7.9.1](https://github.com/mongodb/node-mongodb-native/releases/tag/v7.9.1).
Mongoose 9.12.2 still declares 7.8, so both installation scopes use the same
version-specific override. The registry driver and the cursor cancellation
patch each retain their exact integrity checks.

Node 26.13.1 with synthetic MongoDB 9.0.8 verified ordinary Mongoose
connection, index, model, session, cursor, aggregation and reconnect behavior
with this pair. Before release, require both clean installs and audits, the
existing cursor regressions and the site's isolated runtime acceptance.
Remove the override together in both scopes when Mongoose supports a patched
driver, then requalify the selected driver and cursor cancellation behavior.
