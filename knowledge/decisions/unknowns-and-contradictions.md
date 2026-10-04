# Unknowns and Decisions Requiring Validation

## Resolved by Stage 01
- PostgreSQL 17.11, AGE 1.7.0, pgvector 0.8.7.
- Runtime roles are non-superuser and do not bypass RLS.

## Resolved by Stage 02
- Relational and AGE graph tenant isolation works in the tested runtime.
- Cross-tenant graph inference is denied.

## Resolved by Stage 03
- Supabase Auth + PostgREST core compatibility is validated.
- Signed JWT claims can reach PostgreSQL RLS through PostgREST.
- Production tenant-claim issuance remains undecided.

## Resolved by Stage 04
- Schema Catalog v1 is authoritative for current metadata domains.
- Catalog refresh is deterministic.
- Runtime catalog access is read-only.

## Resolved by Stage 05
- Query IR v1 is engine-neutral, versioned and deterministic.
- Engine-specific fragments are excluded.

## Resolved by Stage 06
- Validation is a pre-compilation boundary.
- Schema references, tenant context, capabilities, parameters, depth, result limits and deterministic cost are checked.
- service_role requires trusted backend context.

## Resolved by Stage 07
- AGE prepared statements use Cypher parameters plus a PostgreSQL agtype parameter-map argument.
- Vibe can compile and execute a one-hop Query IR against AGE without interpolating filter values.
- Compiler identifiers are defensively validated.
- Output columns are deterministic.

## Remaining UNKNOWNs
- Secure Execution Engine transaction and connection lifecycle.
- Planner boundary and compiler selection.
- Recursive-CTE fallback routing.
- Production Auth tenant-claim issuance.
- Full AGE mutation privilege matrix.
- Graph mutation authorization.
- Production vector dimensions/index strategy.
- Realtime transport/authorization.
- Storage authorization/object isolation.
- Supavisor topology/security.
- Scoped AI/MCP capability issuance/revocation/audit.
- Cloud topology, backups, RPO/RTO, billing and metering.
