# VibePlatform Coding-Agent Build Plan

This is the canonical execution guide for coding agents working on VibePlatform.

## Current state

Stages 00 through 05 are validated by executable repository/CI evidence.

Stage 03 core enables Supabase Auth and PostgREST. Realtime, Storage and Supavisor remain explicit compatibility candidates until their own health/security evidence exists.

Stage 04 provides the authoritative, versioned Schema Catalog.

Stage 05 provides Vibe Query IR v1 as the engine-neutral query-intent boundary.

The next implementation target is Stage 06 — Query Validation + Cost Guardrails.

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

The v1 IR is versioned, engine-neutral and contains:

- graph name;
- root label and alias;
- ordered traversal steps;
- edge direction;
- target label and alias;
- declarative filters;
- projections;
- ordering;
- limit/offset;
- depth;
- typed parameters;
- structured v1 errors.

Unknown fields are rejected. Raw SQL, Cypher, AGE expressions and executable fragments are outside the contract.

Canonical JSON recursively sorts object keys, preserves array order and uses compact UTF-8 JSON. Golden fixtures have stable SHA-256 digests.

Exit gate: representative graph queries have deterministic IR representations.

Status: VALIDATED by .github/workflows/stage-05-query-ir.yml.

## Stage 06 — Query Validation + Cost Guardrails

Reject unsafe/expensive requests before execution. Validate:

- schema references against the Schema Catalog;
- tenant scope;
- allowed operations;
- depth;
- result limits;
- parameter types;
- complexity/cost;
- role/capability permissions;
- malformed/unknown IR.

Exit gate: invalid/over-limit requests fail before database execution.

Status: NEXT.

## Stage 07 — Apache AGE Compiler

Compile approved Query IR into safe AGE execution with deterministic output, parameter handling, schema validation and compiler tests.

## Stage 08 — Secure Execution Engine

Centralise request → auth → IR → validation → planning → compile → transaction → RLS → execution → normalized response.

## Stage 09 — Graph Mutations

Implement safe graph create/update/delete using mutation IR, authorization, validation, transactions, conflict handling and auditability.

## Stage 10 — JavaScript SDK

Expose Vibe concepts rather than AGE internals. Provide typed traversal/query APIs and safe errors.

## Stage 11 — CLI

Provide validated workflows such as project/config inspection, schema inspection, migrations, query execution, type generation and diagnostics.

## Stage 12 — Graph Realtime

Use ID-only/minimal events and RLS-protected refetch.

## Stage 13 — Graph Studio

Build the UI only on proven backend contracts. Normal users must never get unrestricted Cypher.

## Stage 14 — MCP

Expose scoped agent capabilities with explicit approval for destructive actions.

## Stage 15 — GraphRAG

Combine graph traversal and pgvector retrieval through the same security boundary.

## Stage 16 — Observability

Add structured logs, metrics, tracing and request IDs without leaking secrets or protected data.

## Stage 17 — Backup + Recovery

Prove backup/restore procedures and establish evidence-backed RPO/RTO.

## Stage 18 — Vibe Cloud

Build the private hosted control plane.

## Stage 19 — Billing + Metering

Define usage dimensions and billing only after runtime usage is stable.

## Stage 20 — Production Readiness

Final gates cover security, reliability, backups, observability, performance, migrations, compatibility, documentation and operational readiness.

## Definition of done

A stage is complete only when implementation exists, relevant tests actually ran, security implications were checked, knowledge is updated, blockers are explicit, and the next stage is identified.
