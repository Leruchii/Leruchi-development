# VibePlatform Coding-Agent Build Plan

This is the canonical execution guide for coding agents working on VibePlatform.

## Current state

Stages 00, 01 and 02 are validated by executable repository/CI evidence.

Do not skip directly to Graph Studio, MCP, GraphRAG, billing or cloud.

## Agent contract

Every agent must:

1. Read AGENTS.md.
2. Read the relevant knowledge files.
3. Load the relevant skill(s).
4. Inspect the existing repository before changing anything.
5. Work only on the assigned stage.
6. Run the stage's tests/evidence checks.
7. Update knowledge with evidence-backed facts.
8. Report blockers and UNKNOWNs.
9. Never claim completion without executed evidence.

## Stage 00 — Repository Bootstrap

Establish a clean, reproducible repository.

Exit gate: repository structure, agent instructions, knowledge base, skills, prompts, Git hygiene, local development entrypoint and test conventions are understandable and usable.

Status: VALIDATED.

## Stage 01 — PostgreSQL + AGE + pgvector

Prove pinned PostgreSQL, compatible AGE, pgvector, reproducible Docker/dev environment, separated roles, graph creation/traversal, vector query, automated tests and no runtime superuser dependency.

Exit gate: all Prompt 01 acceptance tests pass.

Status: VALIDATED by .github/workflows/stage-01-db.yml.

## Stage 02 — RLS + AGE Security

Create at least two tenants and prove:

- A → A allowed;
- A → B read denied;
- A → B update denied;
- A → B delete denied;
- A → B graph traversal denied;
- cross-tenant inference paths denied;
- B → A denied.

The Stage 02 spike uses tenant-bound database roles to validate the database boundary. Auth/JWT context propagation into a shared runtime role remains UNKNOWN.

Exit gate: adversarial tenant-isolation suite passes.

Status: VALIDATED by .github/workflows/stage-02-security.yml.

## Stage 03 — Supabase Compatibility

Integrate only services that reduce duplication:

- Auth;
- PostgREST;
- Realtime;
- Storage;
- pooling.

Do not reimplement these unnecessarily.

Stage 03 must resolve how Supabase Auth/PostgREST establishes trusted tenant context for RLS without allowing an untrusted client to select another tenant.

Exit gate: selected services run within the Vibe security model.

Status: NEXT.

## Stage 04 — Schema Catalog

Create one authoritative metadata source for relational schema, graph labels, edge types, relationships, relevant properties, vector metadata and policy metadata.

Exit gate: metadata can be inspected programmatically and consumed by later layers.

## Stage 05 — Vibe Query IR

Define a versioned, engine-neutral contract for graph operations:

- traversal;
- filters;
- projections;
- ordering;
- limits;
- depth;
- parameters;
- errors.

Do not expose AGE/Cypher details in the public IR.

Exit gate: representative graph queries have deterministic IR representations.

## Stage 06 — Query Validation + Cost Guardrails

Reject unsafe/expensive requests before execution. Validate schema references, tenant scope, allowed operations, depth, result limits, parameter types, complexity/cost and role/capability permissions.

Exit gate: invalid/over-limit requests fail before database execution.

## Stage 07 — Apache AGE Compiler

Compile approved Query IR into safe AGE execution with deterministic output, parameter handling, schema validation and compiler tests.

Exit gate: golden IR → AGE query tests pass.

## Stage 08 — Secure Execution Engine

Centralise request → auth → IR → validation → planning → compile → transaction → RLS → execution → normalized response.

No client surface bypasses this boundary.

Exit gate: API execution and security tests pass.

## Stage 09 — Graph Mutations

Implement safe graph create/update/delete using mutation IR, authorization, validation, transactions, conflict handling and auditability.

Exit gate: mutation and adversarial tests pass.

## Stage 10 — JavaScript SDK

Expose Vibe concepts rather than AGE internals. Provide typed traversal/query APIs and safe errors.

Exit gate: SDK integration tests pass.

## Stage 11 — CLI

Provide validated workflows such as project/config inspection, schema inspection, migrations, query execution, type generation and diagnostics.

Exit gate: CLI end-to-end tests pass.

## Stage 12 — Graph Realtime

Use ID-only/minimal events:

mutation → outbox/trigger → event → client refetch through Graph API → RLS → UI.

Exit gate: cross-tenant realtime subscription tests pass.

## Stage 13 — Graph Studio

Build the UI on proven backend contracts using the Vibe UI skill, Type C canvas architecture, Graph Explorer, Schema view, Traversal Builder and Policy Tester.

Normal users must never get unrestricted Cypher.

Provisional Graph Studio limits:

- default depth 2;
- maximum depth 6;
- default results 100;
- maximum results 1000.

Exit gate: UI, accessibility, backend contract and Base UI audit checks pass.

## Stage 14 — MCP

Expose scoped agent capabilities. Classify operations as READ / WRITE / DESTRUCTIVE / ADMIN. Destructive actions require explicit approval.

Exit gate: capability-scope and audit tests pass.

## Stage 15 — GraphRAG

Combine graph traversal and pgvector retrieval through the same security boundary with tenant-aware retrieval, source attribution and bounded context.

Exit gate: retrieval, security and evaluation tests pass.

## Stage 16 — Observability

Add structured logs, metrics, tracing and request IDs without leaking secrets or protected data.

## Stage 17 — Backup + Recovery

Prove backup/restore procedures and establish evidence-backed RPO/RTO.

## Stage 18 — Vibe Cloud

Build the private hosted control plane for provisioning, lifecycle, regions, metering and operations. Keep private-cloud concerns out of the OSS runtime contract.

## Stage 19 — Billing + Metering

Define usage dimensions and billing only after runtime usage is stable.

## Stage 20 — Production Readiness

Final gates cover security, reliability, backups, observability, performance, migrations, compatibility, documentation and operational readiness.

## Definition of done for every stage

A stage is complete only when implementation exists, relevant tests actually ran, security implications were checked, knowledge is updated, blockers are explicit, and the next stage is identified.
