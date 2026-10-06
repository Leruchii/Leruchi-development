# VibePlatform Architecture

> **Canonical architecture/build plan:** see the root `BUILD_PLAN.md`. This file records durable architecture evidence and validated execution facts; it does not replace the canonical plan.

Status: DECIDED design / Stage 25 VALIDATED

## Validated execution path

Trusted request context
→ Query IR v1
→ Schema/security/cost validation
→ Apache AGE compiler
→ Secure Execution Engine
→ single database transaction
→ PostgreSQL/AGE/RLS
→ normalized result

No client surface may bypass this path.

## Stage 08 Secure Execution Engine

The engine is the central read-only graph execution boundary.

It:
- requires trusted execution context;
- validates before compilation;
- validates request parameters before BEGIN;
- compiles only validated IR;
- executes on one transaction-scoped client;
- commits only after success;
- rolls back after execution failure;
- normalizes results;
- normalizes database failures without exposing raw database details.

The live Stage 08 integration uses the Stage 02 tenant roles and demonstrates tenant-A graph visibility remains isolated by PostgreSQL RLS even though both tenants use the same graph schema.

The engine is read-only in v1. Mutations are Stage 09.

## Current validation state

- Repository bootstrap: VALIDATED
- Database foundation: VALIDATED
- Tenant security: VALIDATED
- Supabase Auth + PostgREST core: VALIDATED
- Schema Catalog: VALIDATED
- Query IR v1: VALIDATED
- Query validation + cost guardrails: VALIDATED
- AGE compiler: VALIDATED
- Secure execution engine: VALIDATED
- Graph mutations: VALIDATED
- JavaScript SDK: VALIDATED
- Realtime: VALIDATED
- Storage: NOT IMPLEMENTED/VALIDATED
- Pooling: NOT IMPLEMENTED/VALIDATED
- SDK: VALIDATED
- CLI: IMPLEMENTED — NOT YET VALIDATED
- Graph Studio: NOT IMPLEMENTED/VALIDATED
- MCP: NOT IMPLEMENTED/VALIDATED
- GraphRAG: NOT IMPLEMENTED/VALIDATED
- Cloud: DEFERRED

Current implementation target: Stage 24 — Retrieval Explainability, Evaluation & Agent-Safety Boundary.


## Durable agent + developer architecture priority

Leruchi is intentionally designed for both humans/developers and AI agents.

### Developer path

```
SDK / REST / SQL / CLI / Studio
             ↓
       Query IR / Mutation IR
             ↓
     validation + capabilities
             ↓
        planner/compiler
             ↓
     Secure Execution Engine
             ↓
       PostgreSQL / AGE / RLS
```

### Agent action path

```
Human instruction
       ↓
     AI Agent
       ↓
       MCP
       ↓
trusted identity + scoped capability
       ↓
Query IR / Mutation IR
       ↓
validation + approval policy
       ↓
planner/compiler + Secure Execution Engine
       ↓
PostgreSQL / AGE / RLS
       ↓
audit/outbox + normalized result
```

MCP must support both read and authorized write/action workflows, but must never receive unrestricted database authority. Developers must be able to use Leruchi comfortably without understanding the internal execution engine. This is a durable product and architecture priority for all future coding agents.

## Stage 21–22 planner architecture

Stage 21 validated capability-driven graph engine selection and a constrained PostgreSQL recursive fallback. Stage 22 validated the extension of that boundary to Retrieval IR without creating a parallel execution model.

Retrieval planning is source-aware: graph retrieval selects Apache AGE by default or an explicitly registered PostgreSQL recursive capability; vector retrieval selects the PostgreSQL/pgvector capability; hybrid retrieval creates two source execution targets and leaves deterministic weighted-RRF fusion above those sources. Retrieval validation, trusted ExecutionContext, Schema Catalog, cost/result guardrails, RLS and the Secure Execution Engine remain authoritative. Final validation proved this architecture against the repository regression matrix and live Stage 15 hybrid retrieval.


## Stage 23 unified retrieval surface

The validated Stage 22 planner is now consumed by one public retrieval contract across developer and agent surfaces.

Developer path:

    SDK / CLI
        ↓
    Retrieval IR v1
        ↓
    Graph API retrieval boundary
        ↓
    Retrieval validation + capability checks
        ↓
    Retrieval planner
        ↓
    Secure retrieval execution
        ↓
    PostgreSQL/AGE/pgvector

Agent path:

    AI Agent
        ↓
    MCP retrieval.query
        ↓
    Retrieval IR v1 validation
        ↓
    same Graph API retrieval boundary
        ↓
    same validation/capability/planner/execution path

The SDK builder and CLI do not compile or authorize retrieval. MCP is not privileged. The Graph API remains the authoritative capability and tenant boundary.

Public retrieval results may expose bounded plan mode/engine metadata and bounded fusion/limit metadata. They must not expose tenant IDs, catalog references, embeddings, raw parameters, SQL, Cypher or credentials.

Stage 23 also corrects retrieval telemetry so the duration metric labels the actual planned mode rather than assuming every request is hybrid.


## Stage 24 explainability and agent-safety boundary

Stage 24 adds a non-executing diagnostic layer over the canonical Retrieval IR and Stage 22 deterministic planner. The diagnostic path validates intent, checks the authenticated capability boundary, invokes the same planner, and returns only engine-neutral mode/reason metadata plus a canonical IR hash. It never compiles or executes retrieval.

Developer SDK/CLI and MCP explanation requests converge on the Graph API `/v1/retrieval/explain` route. The existing `/v1/retrieval/query` route remains the only retrieval execution path.

Retrieval execution now emits a sanitized correlation event containing request ID, retrieval mode, planner decision and outcome. Observability excludes tenant identifiers, embeddings, raw parameters, catalog references and physical engine names.

Stage 24 remains unvalidated until focused and repository-wide CI evidence is green.


## Stage 25 architecture — MCP Agent Tool Contract & Input Safety

The MCP gateway remains an agent-facing contract over the existing Leruchi API. Stage 25 adds deterministic safety metadata and bounded input admission before transport.

- Every tool publishes read-only, destructive, idempotent and open-world hints for agent planning.
- Tool annotations describe behavior; they do not grant authorization.
- Serialized agent arguments are bounded to 64 KiB and 20 levels of nesting before the data plane is contacted.
- Tenant identity, capabilities, mutation approval and secure execution remain server-authoritative.
- No new executor, authorization path, physical-engine contract or autonomous policy engine is introduced.
