# Unknowns and Decisions Requiring Validation

## Resolved

- PostgreSQL 17.11, Apache AGE 1.7.0 and pgvector 0.8.7 are pinned and exercised in CI.
- Two-tenant relational and AGE graph RLS isolation is validated.
- Supabase Auth + PostgREST core is validated.
- Schema Catalog v1 is authoritative and deterministic.
- Query IR v1 is engine-neutral and deterministic.
- Query validation/cost guardrails run before compilation.
- AGE compiler uses prepared statements and parameter maps without value interpolation.
- Secure Execution Engine enforces trusted context → validation → compilation → transaction → RLS → normalized response.
- Graph mutation IR, authorization and transaction semantics are validated.
- Graph realtime outbox/replay and tenant isolation are validated.
- MCP scoped capabilities, destructive-operation approval and audit boundaries are validated.
- GraphRAG hybrid graph/vector retrieval and tenant isolation are validated.
- Observability redaction, bounded telemetry and tracing are validated.
- Backup/recovery integrity and production-image AGE/pgvector recovery are validated.
- Migration execution is restricted to vibe_migrator and now records SHA-256 migration checksums.
- Graph API pool defaults are bounded and concurrency is exercised by Stage 20.

## Intentionally DEFERRED / UNKNOWN

- Production Auth tenant-authorization claim issuance for a hosted deployment.
- Planner/compiler selection beyond the current validated AGE path.
- Recursive-CTE fallback routing.
- Production vector index strategy for arbitrary customer workloads.
- Storage authorization/object isolation.
- Supavisor topology/security.
- Hosted cloud topology, backup cadence/retention/replication, regional recovery, billing and metering.
- Universal production capacity and numeric RPO/RTO guarantees across arbitrary customer environments.

These items must not be silently promoted into OSS contracts. When evidence resolves one, update this file and the relevant architecture decision.
