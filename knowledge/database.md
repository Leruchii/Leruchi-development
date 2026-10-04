# Database

Status: VALIDATED for Stage 01 — database foundation

## Core stack

- PostgreSQL 17.11
- Apache AGE 1.7.0
- pgvector 0.8.7

PostgreSQL is the system of record and security boundary.

## Stage 01 evidence

The Stage 01 Docker image and CI test suite establish:

- PostgreSQL 17.11 is the database baseline.
- Apache AGE 1.7.0 is loaded.
- pgvector 0.8.7 is loaded.
- The official Apache AGE PG17 1.7.0 release tag is used as the base image.
- AGE and vector extensions are created during initialization.
- vibe_migrator and vibe_runtime are separate login roles.
- Both roles are NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, and NOBYPASSRLS.
- Runtime graph traversal/mutation and vector queries are exercised as vibe_runtime.
- A graph, vertex label, edge label, vertices, an edge, and a vector column/query are covered by executable tests.
- Foundation setup uses deterministic SQL initialization plus psql; a higher-level migration framework is deferred.

## Roles

vibe_migrator is the migration-capable database role.

vibe_runtime is the application/runtime role and must not require superuser privileges.

The complete privilege matrix for tenant-bound operations remains subject to Stage 02 and later stages.

## Migrations

Stage 01 deliberately uses deterministic SQL initialization. A migration framework is deferred until repository needs justify one.

## Vector decisions

vector(3) is a smoke-test dimension only. Production embedding dimensions and index strategy remain UNKNOWN.

## Graph fallback

Recursive CTE support remains required as a fallback implementation path. Routing policy and supported operations remain UNKNOWN.

## Security

RLS is enabled and forced on the foundation probe table. Stage 02 must validate tenant isolation and AGE/RLS enforcement adversarially.

## Known AGE constraint

AGE 1.7.0 graph creation is sensitive to search_path, so Vibe roles and graph initialization explicitly include ag_catalog in the search path. This is an implementation constraint, not a public API contract.
