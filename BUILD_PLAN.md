# VibePlatform Coding-Agent Build Plan

## Current state

Stages 00 through 07 are validated by executable repository/CI evidence.

Stage 03 core enables Supabase Auth and PostgREST. Realtime, Storage and Supavisor remain explicit compatibility candidates until separately validated.

Stage 04 provides the authoritative Schema Catalog.
Stage 05 provides Query IR v1.
Stage 06 provides pre-execution validation and cost guardrails.
Stage 07 provides the Apache AGE compiler.

The next implementation target is Stage 08 — Secure Execution Engine.

## Stage 01 — PostgreSQL + AGE + pgvector
Status: VALIDATED.

## Stage 02 — RLS + AGE Security
Status: VALIDATED.

## Stage 03 — Supabase Compatibility
Status: VALIDATED for Auth + PostgREST core. Realtime, Storage and Supavisor remain unvalidated.

## Stage 04 — Schema Catalog
Status: VALIDATED.

## Stage 05 — Vibe Query IR
Status: VALIDATED.

## Stage 06 — Query Validation + Cost Guardrails
Status: VALIDATED.

## Stage 07 — Apache AGE Compiler

The compiler converts validated read-only Query IR v1 into deterministic AGE prepared-statement SQL.

It:
- validates identifiers defensively;
- uses Cypher parameters and the PostgreSQL agtype parameter map;
- never interpolates filter values;
- derives deterministic output columns;
- rejects invalid identifiers and duplicate aliases.

The live CI gate seeds the Stage 01 graph and executes the generated prepared statement.

Exit gate: golden IR → AGE query tests pass.

Status: VALIDATED by .github/workflows/stage-07-age-compiler.yml.

## Stage 08 — Secure Execution Engine

Centralise:
request → authentication → Query IR → Schema/security/cost validation → planner → compiler → transaction → RLS → execution → normalized response.

The execution engine must prevent any client surface from bypassing validation or RLS.

Exit gate: end-to-end execution and adversarial security tests pass.

Status: NEXT.

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
