# VibePlatform Architecture

Status: DECIDED design / partially VALIDATED through Stage 07

## Validated execution path

Client intent
→ Query IR v1
→ Schema/security/cost validation
→ Apache AGE compiler
→ secure execution (Stage 08)
→ PostgreSQL / AGE

## Stage 07 AGE compiler

The compiler is an implementation detail behind the Query IR boundary.

It generates prepared-statement SQL using AGE's documented model: Cypher parameters such as $name are placed inside the Cypher query, while a PostgreSQL parameter is passed as the third cypher() argument and receives an agtype parameter map. citeturn17view0turn17view1

Compiler rules:
- strict identifier validation;
- no raw Cypher input;
- no filter-value interpolation;
- deterministic projection aliases;
- deterministic prepared SQL;
- read-only graph_query compilation in v1.

The compiler is not an authorization boundary. Stage 06 must run first, and Stage 08 will enforce the full execution path.

## Current validation state

- Repository bootstrap: VALIDATED
- Database foundation: VALIDATED
- Tenant security: VALIDATED
- Supabase Auth + PostgREST core: VALIDATED
- Schema Catalog: VALIDATED
- Query IR v1: VALIDATED
- Query validation + cost guardrails: VALIDATED
- AGE compiler: VALIDATED
- Secure execution engine: NOT IMPLEMENTED/VALIDATED
- Graph mutations: NOT IMPLEMENTED/VALIDATED
- Realtime: NOT IMPLEMENTED/VALIDATED
- Storage: NOT IMPLEMENTED/VALIDATED
- Pooling: NOT IMPLEMENTED/VALIDATED
- SDK: NOT IMPLEMENTED/VALIDATED
- Graph Studio: NOT IMPLEMENTED/VALIDATED
- MCP: NOT IMPLEMENTED/VALIDATED
- GraphRAG: NOT IMPLEMENTED/VALIDATED
- Cloud: DEFERRED

Next implementation target: Stage 08 — Secure Execution Engine.
