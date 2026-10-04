# VibePlatform Architecture

Status: DECIDED design / partially VALIDATED through Stage 06

## Query execution boundary

The validated backend path is now:

Client intent
→ Query IR v1
→ Schema/security/cost validation
→ AGE or PostgreSQL compiler
→ secure execution
→ PostgreSQL / AGE / pgvector

Stage 06 is the pre-compilation gate. It does not execute queries.

## Stage 06 guardrails

Validated guardrails:

- Schema Catalog graph allowlisting;
- graph label and edge endpoint validation;
- trusted tenant context requirement;
- graph:read capability requirement;
- service_role trusted-backend restriction;
- parameter reference validation;
- max depth 6;
- max results 1000;
- deterministic cost budget 100;
- engine-fragment rejection.

Tenant authorization is never inferred from Query IR content.

## Current validation state

- Repository bootstrap: VALIDATED
- Database foundation: VALIDATED
- Tenant security: VALIDATED
- Supabase Auth + PostgREST core: VALIDATED
- Schema Catalog: VALIDATED
- Query IR v1: VALIDATED
- Query validation + cost guardrails: VALIDATED
- Realtime: NOT IMPLEMENTED/VALIDATED
- Storage: NOT IMPLEMENTED/VALIDATED
- Pooling: NOT IMPLEMENTED/VALIDATED
- AGE compiler: NOT IMPLEMENTED/VALIDATED
- Secure execution engine: NOT IMPLEMENTED/VALIDATED
- Graph mutations: NOT IMPLEMENTED/VALIDATED
- SDK: NOT IMPLEMENTED/VALIDATED
- Graph Studio: NOT IMPLEMENTED/VALIDATED
- MCP: NOT IMPLEMENTED/VALIDATED
- GraphRAG: NOT IMPLEMENTED/VALIDATED
- Cloud: DEFERRED

Next implementation target: Stage 07 — Apache AGE Compiler.
