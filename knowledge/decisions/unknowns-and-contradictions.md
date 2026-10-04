# Unknowns and Decisions Requiring Validation

This file tracks unresolved questions. UNKNOWN is not permission to guess.

## Resolved contradictions

### Build order
The numbered build order is canonical. UI is implemented at Stage 13 after the backend foundations are proven.

Reason: Graph Studio must consume a stable Graph API, Query IR, Schema Catalog and security contract rather than becoming an alternate source of architecture.

### Skill naming
The canonical security skill is `vibe-security`. AGE-specific guidance is provided by `vibe-age`. PostgreSQL guidance is provided by `vibe-postgres`.

### Graph limits
Provisional UI values are:

- depth default 2;
- depth maximum 6;
- result default 100;
- result maximum 1000.

The backend contract must validate or revise these values before Graph Studio is considered complete.

## Remaining UNKNOWNs

- Pinned PostgreSQL, AGE and pgvector versions.
- Database role names and privilege matrix.
- Migration tooling and schema layout.
- Exact AGE/RLS enforcement model.
- Query IR schema and versioning.
- Query planner rules.
- Recursive-CTE fallback routing and supported operations.
- Graph mutation representation.
- Supabase compatibility scope and exact service versions.
- Scoped capability issuance, revocation and audit model.
- Auth/JWT claim model.
- Realtime transport/channel model and delivery guarantees.
- Graph canvas library.
- Cloud hosting/deployment topology.
- Backup RPO/RTO.
- Pricing/billing model.
