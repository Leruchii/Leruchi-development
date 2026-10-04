# VibePlatform Coding-Agent Build Plan

## Current state

Stages 00 through 08 are validated by executable repository/CI evidence.

Stage 03 is the Supabase Compatibility Core. Auth + PostgREST are validated. Realtime is deferred to Stage 12, Storage is requirement-driven, and Supavisor/pooling is deferred to infrastructure/cloud work when connection topology is known.

Stage 04 Schema Catalog, Stage 05 Query IR, Stage 06 validation/guardrails, Stage 07 AGE compiler and Stage 08 Secure Execution Engine are validated.

The next implementation target is Stage 09 — Graph Mutations.

## Stage 01 — PostgreSQL + AGE + pgvector
Status: VALIDATED.

## Stage 02 — RLS + AGE Security
Status: VALIDATED.

## Stage 03 — Supabase Compatibility Core
Status: VALIDATED for Auth + PostgREST core.

Validated boundary: Auth initialization, JWT verification, request-claim propagation, PostgREST access, RLS through PostgREST, and tenant isolation.

Deferred by design: Realtime → Stage 12; Storage → requirement-driven; Supavisor/pooling → infrastructure/cloud once topology and connection requirements are known.

Stage 03 is complete at this defined boundary; deferred supporting services do not block Stage 09.

## Stage 04 — Schema Catalog
Status: VALIDATED.

## Stage 05 — Vibe Query IR
Status: VALIDATED.

## Stage 06 — Query Validation + Cost Guardrails
Status: VALIDATED.

## Stage 07 — Apache AGE Compiler
Status: VALIDATED.

## Stage 08 — Secure Execution Engine

The engine enforces:

trusted context → Query IR validation → AGE compilation → declared parameter binding → single-client transaction → PostgreSQL/AGE/RLS → normalized result.

It rejects untrusted context and validation failures before any database call, rejects undeclared/missing parameters before BEGIN, rolls back failed execution, normalizes database errors, and never exposes raw database details.

The live integration uses the Stage 02 tenant roles and proves tenant A can retrieve its own graph path while a tenant-B graph target remains invisible.

Exit gate: end-to-end execution and adversarial security tests pass.

Status: VALIDATED by .github/workflows/stage-08-secure-execution.yml.

## Stage 09 — Graph Mutations

Implement safe graph create/update/delete using mutation IR, authorization, validation, transactions, conflict handling and auditability.

No mutation may bypass the Secure Execution Engine or PostgreSQL RLS.

Exit gate: mutation and adversarial tenant-isolation tests pass.

Status: NEXT.

## Stage 10 — JavaScript SDK
Expose Vibe concepts rather than AGE internals.

## Stage 11 — CLI
Provide validated project, schema, migration, query, type-generation and diagnostics workflows.

## Stage 12 — Graph Realtime
Use ID-only/minimal events and RLS-protected refetch.

## Stage 13 — Graph Studio
Build UI only on proven backend contracts. Normal users must never get unrestricted Cypher.

## Stage 14 — MCP
Expose scoped agent capabilities with explicit approval for destructive actions.

## Stage 15 — GraphRAG
Combine graph traversal and pgvector retrieval through the same security boundary.

## Stage 16 — Observability
Add structured logs, metrics, tracing and request IDs without leaking secrets.

## Stage 17 — Backup + Recovery
Prove backup/restore procedures and evidence-backed RPO/RTO.

## Stage 18 — Vibe Cloud
Build the private hosted control plane.

## Stage 19 — Billing + Metering
Define usage dimensions and billing only after runtime usage is stable.

## Stage 20 — Production Readiness
Final gates cover security, reliability, backups, observability, performance, migrations, compatibility, documentation and operational readiness.

## Definition of done
A stage is complete only when implementation exists, relevant tests actually ran, security implications were checked, knowledge is updated, blockers are explicit, and the next stage is identified.
