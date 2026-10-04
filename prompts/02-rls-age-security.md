# Build Prompt 02 — RLS + AGE Security

## Mission

Prove that PostgreSQL RLS and Apache AGE enforce tenant isolation before any API, SDK, Query IR or UI layer is built.

## Required reading

Read AGENTS.md, knowledge/architecture.md, knowledge/database.md, knowledge/security.md, knowledge/testing.md, BUILD_PLAN.md, and the relevant PostgreSQL/AGE skills.

## Scope

Implement only the tenant-isolation security spike.

Do NOT implement Query IR, Graph API, SDK, CLI, Graph Studio, MCP, GraphRAG, Cloud or billing.

## Acceptance criteria

For at least two tenants, executable tests must prove:

- A -> A allowed;
- A -> B read denied;
- A -> B update denied;
- A -> B delete denied;
- A -> B graph traversal denied;
- A -> B graph inference denied;
- B -> A denied;
- runtime roles do not bypass RLS;
- AGE graph label RLS participates in graph queries.

The tests must include an intentionally cross-tenant graph relationship to test inference through an edge.

## Design constraint

Tenant context propagation from JWT/Auth into a shared runtime role is NOT decided by this stage. Use tenant-bound database roles for the spike so the database boundary itself can be tested without pretending an untrusted session GUC is secure.

## Evidence

Run the Docker/CI suite. Do not mark Stage 02 validated from policy definitions alone.

Report changes, tests, security findings, limitations, remaining UNKNOWNs and next stage.
