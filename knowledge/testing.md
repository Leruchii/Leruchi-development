# Testing

Status: VALIDATED for Stage 01 database foundation

## Core policy

Security tests are merge blockers.

No feature is VALIDATED without relevant executable evidence.

Every build prompt must report:

1. What changed.
2. Files changed.
3. Commands/tests executed.
4. Results.
5. Architecture decisions discovered.
6. Security implications.
7. Remaining UNKNOWN items.
8. Next stage.

## Stage 01 executable coverage

.github/workflows/stage-01-db.yml builds the database image, starts PostgreSQL, waits for readiness, and runs tests/db/stage-01.sql as the non-superuser vibe_runtime role.

Assertions cover:

- PostgreSQL 17+;
- exact AGE 1.7.0;
- exact pgvector 0.8.7;
- runtime role separation and no superuser/RLS bypass;
- vector storage and nearest-neighbour query;
- AGE graph traversal;
- graph vertex and edge creation;
- graph traversal after mutation.

## Merge blocker

The Stage 01 workflow is required evidence for the database foundation. Configuration-only claims are insufficient.

## Next security stage

Stage 02 must add adversarial tenant isolation tests for relational reads/writes/deletes and graph traversal/inference.
