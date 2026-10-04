# Testing

Status: VALIDATED through Stage 02 — tenant isolation

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

The Stage 01 workflow proves the PostgreSQL + AGE + pgvector foundation and runtime non-superuser boundary.

## Stage 02 executable coverage

.github/workflows/stage-02-security.yml builds the same database image, creates two tenant-bound roles and runs adversarial suites for both tenants.

The suite proves:

- same-tenant relational reads;
- cross-tenant relational read denial;
- cross-tenant update denial;
- cross-tenant delete denial;
- same-tenant graph visibility;
- cross-tenant graph read denial;
- same-tenant graph traversal;
- cross-tenant graph traversal denial;
- cross-tenant graph inference denial through an intentionally cross-tenant edge;
- tenant roles do not bypass RLS.

## Security limitation captured by tests

Tenant roles are used only as a database-boundary spike. Auth/JWT-to-database tenant context propagation remains UNKNOWN and is a Stage 03 compatibility/security decision.

## Merge blocker

Stage 01 and Stage 02 workflows are executable evidence. Configuration-only claims are insufficient.
