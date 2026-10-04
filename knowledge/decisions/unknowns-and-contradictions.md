# Unknowns and Decisions Requiring Validation

## Resolved through Stage 08

- PostgreSQL 17.11, AGE 1.7.0, pgvector 0.8.7.
- Two-tenant relational and AGE graph RLS isolation is validated.
- Supabase Auth + PostgREST core is validated.
- Schema Catalog v1 is authoritative and deterministic.
- Query IR v1 is engine-neutral and deterministic.
- Query validation/cost guardrails run before compilation.
- AGE compiler uses prepared statements and parameter maps without value interpolation.
- Secure Execution Engine enforces trusted context → validation → compilation → transaction → RLS → normalized response.
- Transaction rollback and raw database-error normalization are validated.
- Live tenant-A execution cannot retrieve tenant-B graph data through the engine.

## Remaining UNKNOWNs

- Production Auth tenant-authorization claim issuance.
- Shared runtime-role context propagation from PostgREST into the Secure Execution Engine.
- Planner and compiler selection boundary.
- Recursive-CTE fallback routing.
- Graph mutation IR and authorization model.
- AGE mutation privilege matrix.
- Conflict/concurrency semantics for graph mutations.
- Production vector dimensions/index strategy.
- Realtime transport/authorization.
- Storage authorization/object isolation.
- Supavisor topology/security.
- Scoped AI/MCP capability issuance/revocation/audit.
- Cloud topology, backups, RPO/RTO, billing and metering.
