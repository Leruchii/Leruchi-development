# Testing

Status: VALIDATED through Stage 03 — Auth + PostgREST compatibility core

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

## Stage 03 executable coverage

.github/workflows/stage-03-supabase.yml proves:

- VibeDB image builds;
- VibeDB database starts;
- compatibility roles and RLS probe are installed;
- Supabase Auth v2.196.0 starts and completes its database migrations;
- PostgREST v14.17 starts and connects to PostgreSQL;
- both service health endpoints are reachable;
- a signed HS256 JWT is accepted by PostgREST;
- the verified JWT claim context reaches PostgreSQL RLS;
- tenant_a data is returned;
- tenant_b data is denied.

The workflow also reruns Stage 01 and Stage 02 on the same PR commit; both remained successful after the Stage 03 integration.

## Stage 03 compatibility scope

Realtime, Storage and Supavisor are present only as explicit Compose profiles and are not VALIDATED. Their presence is not treated as evidence.

## Merge blocker

Stage 01, Stage 02 and the Stage 03 core workflow are executable evidence. Configuration-only claims are insufficient.
