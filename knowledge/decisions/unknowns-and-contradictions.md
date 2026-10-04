# Unknowns and Decisions Requiring Validation

This file tracks unresolved questions. UNKNOWN is not permission to guess.

## Resolved skill names

vibe-security, vibe-postgres, vibe-age, vibe-supabase, vibe-schema-catalog, vibe-query-ir, vibe-query-validation.

## Resolved by Stage 01
- PostgreSQL baseline: 17.11.
- Apache AGE baseline: 1.7.0 for PG17.
- pgvector baseline: 0.8.7.
- Runtime roles are non-superuser and do not bypass RLS.

## Resolved by Stage 02
- Relational and AGE graph tenant isolation works in the tested runtime.
- Cross-tenant graph inference is denied.

## Resolved by Stage 03
- Supabase Auth v2.196.0 initializes against Vibe PostgreSQL.
- PostgREST v14.17 verifies signed JWTs and passes verified claims into PostgreSQL request context.
- REST-boundary tenant isolation is proven.
- Production Auth tenant-claim issuance remains an explicit security decision.

## Resolved by Stage 04
- Schema Catalog v1 is the authoritative metadata contract.
- Catalog refresh is deterministic.
- Graph metadata is explicitly registered.
- Runtime catalog access is read-only.

## Resolved by Stage 05
- Query IR v1 is engine-neutral, versioned and deterministic.
- Engine-specific fragments are outside the contract.
- Structured v1 errors are defined.

## Resolved by Stage 06
- Validation is a separate pre-compilation boundary.
- Schema/graph references are validated against catalog input.
- Trusted tenant context and graph:read capability are mandatory.
- service_role requires trusted backend context.
- Depth/result/cost guardrails are enforced before compilation.
- Cost calculation is deterministic.

## Remaining UNKNOWNs
- Production Auth tenant-authorization claim issuance mechanism.
- Full AGE graph/RLS privilege matrix for all mutation patterns.
- Query planner design.
- AGE compiler parameterization and output normalization details.
- Recursive-CTE fallback routing.
- Graph mutation authorization.
- Production vector dimensions/index strategy.
- Realtime transport and tenant authorization.
- Storage authorization and object isolation.
- Supavisor topology/security.
- Scoped AI/MCP capability issuance/revocation/audit.
- Cloud topology, backups, RPO/RTO, billing and metering.
