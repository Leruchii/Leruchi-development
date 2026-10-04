# Unknowns and Decisions Requiring Validation

This file tracks unresolved questions. UNKNOWN is not permission to guess.

## Resolved contradictions

### Build order

The numbered build order is canonical. UI is implemented at Stage 13 after backend foundations are proven.

### Skill naming

The canonical security skill is vibe-security. AGE guidance is vibe-age. PostgreSQL guidance is vibe-postgres.

### Graph limits

Provisional UI values are depth default 2, maximum 6, result default 100, maximum 1000. Backend validation may revise them.

## Resolved by Stage 01

- PostgreSQL baseline: 17.11.
- Apache AGE baseline: 1.7.0 for PG17.
- pgvector baseline: 0.8.7.
- Database image strategy: official Apache AGE PG17 1.7.0 image pinned by digest, with pgvector compiled into the image.
- Role separation: vibe_migrator and vibe_runtime, both non-superuser and without RLS bypass.
- Foundation migration approach: deterministic SQL initialization with psql; no framework added prematurely.
- Vector smoke-test dimension: 3; production dimension remains undecided.
- AGE graph initialization requires an explicit ag_catalog search path in this baseline.

## Remaining UNKNOWNs

- Exact tenant claims and RLS context propagation.
- Exact AGE graph/RLS privilege matrix for tenant isolation.
- Query IR schema and versioning.
- Query planner and compiler boundaries.
- Recursive-CTE fallback routing and supported operations.
- Graph mutation authorization model.
- Production vector dimensions and index strategy.
- Supabase compatibility scope and exact service versions.
- Realtime transport/channel model and delivery guarantees.
- Scoped AI/MCP capability issuance, revocation, and audit format.
- Cloud topology, backups, RPO/RTO, billing and metering.
