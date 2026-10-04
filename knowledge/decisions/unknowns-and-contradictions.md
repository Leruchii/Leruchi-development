# Unknowns and Decisions Requiring Validation

This file tracks unresolved questions. UNKNOWN is not permission to guess.

## Resolved contradictions

### Build order

The numbered build order is canonical. UI is implemented at Stage 13 after backend foundations are proven.

### Skill naming

The canonical security skill is vibe-security. AGE guidance is vibe-age. PostgreSQL guidance is vibe-postgres. Supabase compatibility guidance is vibe-supabase. Schema Catalog guidance is vibe-schema-catalog.

### Graph limits

Provisional UI values are depth default 2, maximum 6, default results 100, maximum results 1000. Backend validation may revise them.

## Resolved by Stage 01

- PostgreSQL baseline: 17.11.
- Apache AGE baseline: 1.7.0 for PG17.
- pgvector baseline: 0.8.7.
- Database image strategy: official Apache AGE PG17 1.7.0 release tag with pgvector compiled into the image.
- Role separation: vibe_migrator and vibe_runtime, both non-superuser and without RLS bypass.
- Foundation migration approach: deterministic SQL initialization with psql.
- Vector smoke-test dimension: 3; production dimension remains undecided.
- AGE graph initialization requires an explicit ag_catalog search path.

## Resolved by Stage 02

- PostgreSQL RLS can enforce tenant-bound relational read/write/delete isolation.
- AGE label tables can carry PostgreSQL RLS policies.
- AGE graph queries respect those RLS policies in the tested PG17/AGE 1.7.0 runtime.
- A cross-tenant graph edge does not expose the protected destination vertex through the tested traversal/inference path.
- Tenant-bound database roles can provide a secure proof boundary without superuser or BYPASSRLS privileges.

## Resolved by Stage 03

- Supabase Auth v2.196.0 can initialize against the Vibe database.
- PostgREST v14.17 can connect through a limited authenticator role.
- PostgREST can verify a signed HS256 JWT and pass verified claims into PostgreSQL request context.
- PostgreSQL RLS can use verified request JWT claims to enforce tenant visibility through REST.
- PostgREST schema exposure can be restricted to vibe_app.

## Resolved by Stage 04

- Schema Catalog v1 is the authoritative metadata contract for the currently supported relational, graph, vector and policy domains.
- Catalog refresh is deterministic.
- Graph metadata is explicitly registered rather than automatically reflected.
- Catalog population can use privileged PostgreSQL system catalogs without exposing those implementation catalogs to runtime consumers.
- vibe_runtime requires read-only catalog privileges.

## Remaining UNKNOWNs

- Production Auth tenant-authorization claim issuance: trusted app_metadata vs custom access-token hook vs another controlled mechanism.
- Exact production AGE graph/RLS privilege matrix for every mutation operation.
- Query IR schema and versioning.
- Query planner and compiler boundaries.
- Recursive-CTE fallback routing and supported operations.
- Graph mutation authorization model.
- Production vector dimensions and index strategy.
- Realtime transport/channel model and delivery guarantees.
- Realtime tenant authorization and ID-only event implementation.
- Storage authorization, backend and object isolation.
- Pooler/Supavisor topology and security model.
- Scoped AI/MCP capability issuance, revocation, and audit format.
- Cloud topology, backups, RPO/RTO, billing and metering.
