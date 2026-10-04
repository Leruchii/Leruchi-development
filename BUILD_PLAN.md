# VibePlatform Coding-Agent Build Plan

This is the canonical execution guide for coding agents working on VibePlatform.

## Current state

Stages 00 through 06 are validated by executable repository/CI evidence.

Stage 03 core enables Supabase Auth and PostgREST. Realtime, Storage and Supavisor remain explicit compatibility candidates until their own health/security evidence exists.

Stage 04 provides the authoritative Schema Catalog.
Stage 05 provides Query IR v1.
Stage 06 provides the pre-execution validation and cost guardrail boundary.

The next implementation target is Stage 07 — Apache AGE Compiler.

## Stage 00 — Repository Bootstrap
Status: VALIDATED.

## Stage 01 — PostgreSQL + AGE + pgvector
Status: VALIDATED by .github/workflows/stage-01-db.yml.

## Stage 02 — RLS + AGE Security
Status: VALIDATED by .github/workflows/stage-02-security.yml.

## Stage 03 — Supabase Compatibility
Status: VALIDATED for Auth + PostgREST core by .github/workflows/stage-03-supabase.yml. Realtime, Storage and Supavisor remain unvalidated candidates.

## Stage 04 — Schema Catalog
Status: VALIDATED by .github/workflows/stage-04-schema-catalog.yml.

## Stage 05 — Vibe Query IR
Status: VALIDATED by .github/workflows/stage-05-query-ir.yml.

## Stage 06 — Query Validation + Cost Guardrails

The validator runs before any compiler and validates:

- IR version/kind and engine-fragment exclusion;
- graph/label/edge references against Schema Catalog input;
- edge direction and endpoint compatibility;
- trusted tenant context;
- graph:read capability;
- service_role trusted-backend restriction;
- parameter declarations/references;
- maximum depth 6;
- maximum results 1000;
- deterministic cost budget 100.

The validator returns structured errors and does not execute SQL, Cypher, AGE or database queries.

Exit gate: invalid/over-limit requests fail before database execution.

Status: VALIDATED by .github/workflows/stage-06-query-validation.yml.

## Stage 07 — Apache AGE Compiler

Compile approved Query IR into safe AGE execution with deterministic output, parameter handling, schema validation and compiler tests.

Exit gate: golden IR → AGE query tests pass.

Status: NEXT.

## Stage 08 — Secure Execution Engine
Centralise request → auth → IR → validation → planning → compile → transaction → RLS → execution → normalized response.

## Stage 09 — Graph Mutations
Implement safe graph create/update/delete using mutation IR, authorization, validation, transactions, conflict handling and auditability.

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
