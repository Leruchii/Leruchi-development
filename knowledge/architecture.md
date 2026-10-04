# VibePlatform Architecture

> **Canonical architecture/build plan:** see the root `BUILD_PLAN.md`. This file records durable architecture evidence and validated execution facts; it does not replace the canonical plan.

Status: DECIDED design / VALIDATED through Stage 11; Stage 12 Graph Realtime is IMPLEMENTED — NOT YET VALIDATED

## Validated execution path

Trusted request context
→ Query IR v1
→ Schema/security/cost validation
→ Apache AGE compiler
→ Secure Execution Engine
→ single database transaction
→ PostgreSQL/AGE/RLS
→ normalized result

No client surface may bypass this path.

## Stage 08 Secure Execution Engine

The engine is the central read-only graph execution boundary.

It:
- requires trusted execution context;
- validates before compilation;
- validates request parameters before BEGIN;
- compiles only validated IR;
- executes on one transaction-scoped client;
- commits only after success;
- rolls back after execution failure;
- normalizes results;
- normalizes database failures without exposing raw database details.

The live Stage 08 integration uses the Stage 02 tenant roles and demonstrates tenant-A graph visibility remains isolated by PostgreSQL RLS even though both tenants use the same graph schema.

The engine is read-only in v1. Mutations are Stage 09.

## Current validation state

- Repository bootstrap: VALIDATED
- Database foundation: VALIDATED
- Tenant security: VALIDATED
- Supabase Auth + PostgREST core: VALIDATED
- Schema Catalog: VALIDATED
- Query IR v1: VALIDATED
- Query validation + cost guardrails: VALIDATED
- AGE compiler: VALIDATED
- Secure execution engine: VALIDATED
- Graph mutations: VALIDATED
- JavaScript SDK: VALIDATED
- Realtime: IMPLEMENTED — NOT YET VALIDATED
- Storage: NOT IMPLEMENTED/VALIDATED
- Pooling: NOT IMPLEMENTED/VALIDATED
- SDK: VALIDATED
- CLI: IMPLEMENTED — NOT YET VALIDATED
- Graph Studio: NOT IMPLEMENTED/VALIDATED
- MCP: NOT IMPLEMENTED/VALIDATED
- GraphRAG: NOT IMPLEMENTED/VALIDATED
- Cloud: DEFERRED

Current implementation target: complete Stage 12 — Graph Realtime validation.
