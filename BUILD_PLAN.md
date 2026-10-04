# VibePlatform / VibeDB — Canonical Architecture & Build Plan

> **Primary source of truth for architecture and implementation order.**
>
> Coding agents MUST read this file before choosing work. It is the canonical roadmap; `AGENTS.md` is the engineering constitution, `BUILD_STATE.md` is the current execution checkpoint, and `knowledge/` contains durable supporting evidence and decisions.
>
> If these files conflict, prefer executable repository evidence (tests/CI/runtime), then update the documents so they agree. Do not silently invent architecture.

---

## 1. Product definition

VibePlatform / VibeDB is a secure developer/database platform that makes **relational, graph, vector, realtime, and AI-agent access feel like one database**.

The product is not "Supabase plus a graph feature." Its differentiated layer is the Vibe abstraction and developer experience across PostgreSQL, Apache AGE, pgvector, security, query compilation, graph mutations, realtime, and agent access.

Core database strategy:

- PostgreSQL is the system of record.
- PostgreSQL/RLS is the authoritative tenant security boundary.
- Apache AGE provides graph execution behind Vibe abstractions.
- pgvector provides vector search inside PostgreSQL.
- Supabase services are reused where they reduce unnecessary reinvention.
- Vibe exposes stable, engine-neutral contracts rather than exposing AGE internals.
- The OSS repository contains the self-hostable runtime and developer tooling.
- Vibe Cloud is a separate/private control-plane concern.

---

## 2. Five-plane architecture

### Plane 1 — Developer Plane

User-facing developer surfaces:

- JavaScript SDK
- CLI
- REST / Graph API
- Dashboard
- Graph Studio
- MCP server
- AI-agent interfaces

These surfaces consume Vibe contracts. They do not own database compilation, tenant authorization, or AGE-specific execution.

### Plane 2 — API / Compiler Plane

The application intelligence layer:

- Graph API
- Query IR
- Mutation IR
- validation
- cost/depth/result guardrails
- planner
- Schema Catalog
- AGE compiler
- PostgreSQL compiler / recursive-CTE fallback
- Secure Execution Engine
- mutation engine
- policy evaluation
- RAG API

This plane translates trusted, validated Vibe requests into safe database execution.

### Plane 3 — Data Plane

The authoritative data/security layer:

- PostgreSQL
- Apache AGE
- pgvector
- RLS
- migrations
- outbox/event data

PostgreSQL remains the security boundary even when graph operations execute through AGE.

### Plane 4 — Platform Services Plane

Supporting infrastructure, reusing Supabase components where appropriate:

- Supabase Auth
- PostgREST
- Realtime
- Storage
- connection pooling / Supavisor

Compatibility is implemented only where it serves the product and is validated independently.

### Plane 5 — Cloud Control Plane

Private hosted-service concerns:

- project lifecycle
- provisioning
- regions
- infrastructure orchestration
- observability
- backups
- metering
- billing
- hosted operations

Cloud-only concerns must not leak into the OSS runtime contract.

---

## 3. Canonical request architecture

All normal graph-capable client surfaces converge on Vibe's engine-neutral request boundary.

```
SDK / REST / MCP / AI Agent
          ↓
      Vibe Query IR
          ↓
Schema + security validation
          ↓
Cost / depth / result-limit validation
          ↓
Planner / compiler selection
          ↓
AGE compiler or PostgreSQL compiler
          ↓
Secure Execution Engine
          ↓
PostgreSQL / AGE / pgvector
          ↓
Normalized result
```

For writes, the corresponding path is:

```
SDK / REST / MCP / trusted backend
          ↓
      Mutation IR
          ↓
Schema + authorization validation
          ↓
Mutation-specific safety/conflict checks
          ↓
Mutation compiler
          ↓
Secure Execution Engine
          ↓
PostgreSQL / AGE / RLS
          ↓
Audit/outbox metadata
          ↓
Normalized mutation result
```

### Mandatory boundary rules

- Query IR is engine-neutral.
- Mutation IR is a separate explicit write boundary unless a later decision proves a safe unified model.
- AGE is never the public product API.
- Normal clients do not submit unrestricted raw Cypher.
- Raw SQL fragments are not accepted from untrusted callers.
- Values are parameterized; untrusted values are never interpolated into SQL/Cypher.
- Tenant identity comes from trusted execution context, not client payload fields.
- PostgreSQL/RLS remains authoritative.
- The Secure Execution Engine is the intended route from validated Vibe requests to database execution.
- Database errors are normalized before crossing the public boundary.
- Result limits, traversal depth, cost and mutation safety limits are enforced before execution.

---

## 4. Authoritative metadata and security model

### Schema Catalog

The Schema Catalog is the authoritative metadata contract for:

- relational metadata
- graph registries
- graph labels
- edge types
- graph metadata visibility (shared or tenant-owned)
- endpoint compatibility
- vector metadata
- validation
- compilation
- SDK type generation
- MCP
- Graph Studio
- GraphRAG

Agents and UI surfaces must not invent independent schema metadata.

### Graph metadata tenancy

Graph definitions are not automatically one-physical-graph-per-tenant. Vibe supports shared graph definitions for common application schemas and tenant-owned graph definitions for customer-specific schemas. The catalog uses an explicit shared scope (`tenant_id = ''`) and tenant scope (`tenant_id = <tenant>`), protected by PostgreSQL RLS. Shared metadata does not make graph data shared: graph data remains tenant-isolated.

### Tenant isolation

A tenant must not be able to:

- read another tenant's rows;
- update another tenant's rows;
- delete another tenant's rows;
- traverse into another tenant's graph data;
- infer another tenant's data through graph relationships;
- subscribe to another tenant's realtime events;
- bypass authorization by manipulating tenant IDs or request context.

Required security boundary:

```
trusted identity/context
        ↓
authorization/capability checks
        ↓
Schema + request validation
        ↓
PostgreSQL RLS
        ↓
data
```

RLS is not replaced by UI checks, API checks, graph-layer checks, or agent policy checks. Those are additional controls.

### Capabilities and agents

- `service_role` is a trusted backend capability and must not be handed unrestricted to normal clients or AI agents.
- AI/MCP access uses scoped capabilities.
- Destructive agent operations require an explicit workflow such as dry-run, diff/impact review, approval and audit.
- Capability issuance, revocation and audit remain an open design area until validated.

---

## 5. Realtime architecture

Graph realtime should follow:

```
database mutation
    ↓
outbox / trigger event
    ↓
ID-only or minimal realtime notification
    ↓
client refetch through Graph API
    ↓
PostgreSQL RLS applies
    ↓
authorized UI update
```

Realtime events must not become an authorization bypass and should not carry sensitive row/graph payloads when identifiers plus a secure refetch are sufficient.

Realtime is intentionally deferred to **Stage 12** because it depends on a stable mutation/event model.

---

## 6. Supabase compatibility boundary

Vibe reuses Supabase services where appropriate rather than rebuilding equivalent infrastructure prematurely.

### Stage 03 validated boundary

Validated:

- Supabase Auth initialization against Vibe PostgreSQL
- signed JWT verification
- request claim propagation
- PostgREST access
- PostgreSQL RLS through PostgREST
- tenant isolation at the REST boundary

Deferred by design:

- **Realtime → Stage 12**, after mutation/outbox semantics exist.
- **Storage → requirement-driven**, because it is supporting compatibility rather than the core Vibe graph/vector differentiator.
- **Supavisor/pooling → infrastructure/cloud**, once connection topology, concurrency and deployment requirements are known.

Do not reopen Stage 03 simply because those supporting services are not yet implemented.

Production Auth tenant-authorization claim issuance remains an explicit security decision and must be validated before shared-role production deployment.

---

## 7. UI architecture

The UI is built only after backend contracts are proven.

Current UI constitution:

- Next.js + React + TypeScript
- Tailwind CSS v4
- shadcn/ui backed by Base UI
- no Radix
- semantic OKLCH design tokens
- dark default; light theme supported
- no hard-coded component colors
- loading, empty and error states are required
- responsive validation at 360px, 768px and 1440px
- accessibility is required

Graph Studio direction:

### Graph Explorer

- left: labels/edges
- center: graph canvas
- right: inspector
- depth 2 default
- depth 6 maximum
- result cap 100 default
- hard maximum 1000

### Traversal Builder

- left: traversal steps
- center: results / mini graph
- right: compiled query + JSON specification
- normal users do not receive unrestricted Cypher

### Policy Tester

- roles/JWT claims
- visible/hidden rows
- RLS policy behavior

UI must consume the Schema Catalog and proven API contracts rather than inventing backend behavior.

---

## 8. OSS / Vibe Cloud separation

The open-source repository owns:

- database/runtime foundations
- Vibe API/compiler contracts
- developer tooling
- self-hostable services
- security/test infrastructure

Private Vibe Cloud owns hosted concerns such as:

- provisioning
- regional orchestration
- project lifecycle
- hosted backups
- observability
- metering
- billing
- commercial operations

Do not add cloud-only dependencies to the OSS runtime contract.

---

# 9. Canonical sequential build order

Stages are sequential unless an explicit architecture decision changes the order.

## Stage 00 — Repository Bootstrap

Establish the repository constitution, knowledge structure, testing conventions, CI foundations and agent workflow.

**Status:** VALIDATED.

## Stage 01 — PostgreSQL + AGE + pgvector Spike

Pin and prove:

- PostgreSQL 17.11
- Apache AGE 1.7.0 for PG17
- pgvector 0.8.7
- AGE graph creation
- vertices/edges
- traversal
- vector storage/query
- runtime role separation
- non-superuser/non-BYPASSRLS execution

**Status:** VALIDATED.

## Stage 02 — RLS + AGE Security

Prove adversarial two-tenant isolation for:

- relational reads
- updates
- deletes
- graph reads
- graph traversal
- graph inference

**Status:** VALIDATED.

## Stage 03 — Supabase Compatibility Core

Validate:

- Auth initialization
- JWT verification
- trusted request claims
- PostgREST
- REST-boundary RLS
- tenant isolation

Defer:

- Realtime → Stage 12
- Storage → requirement-driven
- Supavisor → infrastructure/cloud

**Status:** VALIDATED for the defined compatibility-core boundary.

## Stage 04 — Schema Catalog

Create the authoritative, deterministic, read-only catalog contract for relational, graph and vector metadata.

Validate:

- graph registration
- labels
- edge types
- endpoint compatibility
- ownership/visibility
- deterministic runtime access

**Status:** VALIDATED.

## Stage 05 — Vibe Query IR

Create an engine-neutral, versioned, deterministic read Query IR.

Validate:

- canonical serialization
- deterministic hashing
- structured errors
- no raw engine fragments

**Status:** VALIDATED.

## Stage 06 — Query Validation + Cost Guardrails

Validate before compilation:

- IR version/kind
- Schema Catalog references
- edge direction/endpoints
- trusted tenant context
- capabilities
- parameter declarations/references
- max depth 6
- max results 1000
- cost budget 100
- service-role restrictions

**Status:** VALIDATED.

## Stage 07 — Apache AGE Compiler

Compile only validated read Query IR.

Rules:

- defensive identifier validation
- no raw Cypher input
- no SQL fragments
- no filter-value interpolation
- AGE parameter maps
- deterministic output
- malicious identifiers/values rejected

**Status:** VALIDATED.

## Stage 08 — Secure Execution Engine

Canonical read execution:

```
trusted context
→ validation
→ AGE compilation
→ parameter binding
→ one transaction-scoped client
→ PostgreSQL/AGE/RLS
→ normalized result
```

Validate:

- zero DB calls on validation failure
- parameter checks before BEGIN
- commit on success
- rollback on failure
- normalized errors
- normalized rows/columns
- live tenant isolation

**Status:** VALIDATED.

## Stage 09 — Graph Mutations

Implement safe:

- create vertex
- create edge
- update vertex
- update edge
- delete edge
- delete vertex

Required:

- Mutation IR
- schema validation
- authorization/capabilities
- tenant-context enforcement
- parameterization
- mutation compiler
- Secure Execution Engine integration
- transactionality
- rollback
- conflict/concurrency semantics
- audit metadata
- adversarial tenant tests

No mutation may bypass the Secure Execution Engine or PostgreSQL RLS.

**Status:** VALIDATED.

Validation evidence: Stage 09 CI passed unit/adversarial tests and database-backed RLS mutation tests. Tenant A successfully created tenant-owned graph data; tenant B data remained invisible to update/delete; cross-tenant edge creation matched zero visible endpoints. Transaction rollback, capability enforcement, tenant override rejection, and injection resistance are covered by tests.\n\nConflict semantics for v1: mutations operate on the tenant-visible current state inside one database transaction. No optimistic version field is introduced yet; an update/delete that matches zero visible targets is a safe no-op, while concurrent writes rely on PostgreSQL transaction/row-lock behavior. Last-writer-wins is the explicit v1 behavior when concurrent updates target the same property.\n\nAudit boundary for v1: every execution has a request ID plus tenant, operation, graph and target metadata in the normalized mutation result. Durable outbox/realtime persistence remains Stage 12.

**Exit gate:** mutation tests, adversarial tenant-isolation tests, transaction/rollback tests, authorization tests, security review, CI, knowledge updates and explicit conflict semantics all pass.

## Stage 10 — JavaScript SDK

Expose Vibe concepts, not AGE internals.

Implemented:
- authenticated bearer-token HTTP transport;
- graph query builder over Query IR v1;
- graph mutation builder over Mutation IR v1;
- typed parameter declarations with values kept outside IR;
- client-side identifier, depth and result-limit guardrails;
- injectable transport for deterministic tests;
- normalized client error model;
- package metadata and usage documentation.

Security boundary:
- the SDK never accepts raw Cypher or SQL;
- tenant identity is not a client authorization input;
- client-side checks are fail-fast UX only;
- server-side Schema Catalog validation, capabilities, RLS, cost controls and execution remain authoritative.

Scope boundary:
- default HTTP routes are an SDK transport contract;
- production Graph API/runtime implementation and end-to-end server execution are validated outside Stage 10.

**Status:** VALIDATED.

**Evidence:** PR #12 merged as `62366581a44183ed500a121ec3c9890d72ef21c5`; Stage 10 workflow run `37195877514` passed all SDK tests and import verification.

## Stage 11 — CLI

Provide validated workflows for:

- project configuration
- schema inspection
- migrations
- graph queries
- graph mutations
- type generation
- diagnostics
- local development

Implemented so far:
- project base-URL configuration without token persistence;
- graph query and mutation commands delegated to the JavaScript SDK;
- Schema Catalog type generation from local catalog JSON;
- diagnostics endpoint check;
- local Docker Compose status;
- CLI parser and adversarial tests.

CLI does not become a second compiler/security boundary.

**Status:** VALIDATED — catalog tenancy hardening and automated exit-gate validation passed.

Implemented in this hardening pass:
- forward-only numbered migrations with a migrator-only ledger;
- CLI migration execution requiring a `vibe_migrator` connection;
- authenticated remote Schema Catalog HTTP contract;
- remote CLI inspection/type-generation path;
- adversarial tenant-private catalog visibility tests;
- repository-wide architecture regression audit.

Exit gate passed on commit `193877e9c785f40d8dc8dd3d8f7128d82a6f81e9`: fresh PostgreSQL/AGE environment, migration runner, remote Schema Catalog, tenant-private metadata isolation, and architecture audit all passed.

## Stage 12 — Graph Realtime

Implement the ID-only/minimal-event architecture.

Required:

- mutation/outbox integration
- event authorization
- tenant isolation
- RLS-protected refetch
- reconnect/replay semantics
- subscription lifecycle
- adversarial event-isolation tests

**Status:** VALIDATED.

Fresh validation run `37210250276` passed after the replay/topic hardening, including opaque topics and trusted relay-only replay.

## Stage 13 — Graph Studio

Build the dashboard/graph UI on proven backend contracts.

Required areas:

- Graph Explorer
- Traversal Builder
- Policy Tester
- schema browsing
- graph inspection
- mutation workflows
- loading/empty/error states
- accessibility
- responsive layouts

Normal users must not receive unrestricted free-form Cypher.

**Status:** VALIDATED.

Validated: authenticated tenant A/B browser evidence, responsive/accessibility evidence, live Graph API/Schema Catalog composition against PostgreSQL/AGE/RLS, and SVG renderer browser benchmark at 100/500/1,000 nodes. SVG acceptance is scoped to the current bounded node canvas; visible-edge topology remains a future performance gate.

Implemented: Graph Studio shell, Type C Graph Explorer spike, Vibe UI reference contracts, source-only Base UI audit, and typecheck/build CI.

Remaining: authenticated Graph API integration, live Schema Catalog integration, Graph Schema, Traversal Builder, loading/empty/error states against real requests, browser accessibility/responsive evidence, and 1,000-node/3,000-edge renderer benchmark.

## Stage 14 — MCP Server

Expose Vibe capabilities to AI agents.

Required:

- scoped capabilities
- schema discovery
- graph read tools
- mutation tools
- tenant isolation
- destructive-operation approval
- auditability
- capability issuance/revocation design
- prompt/tool input validation

Never give normal agents unrestricted `service_role`.

**Status:** VALIDATED.

Validated: MCP JSON-RPC stdio contract, tenant-authority rejection, closed tool schemas, Schema Catalog capability gating, scoped capability-grant contract, tenant-scoped destructive-operation approval, preview mode, structured auditability, live MCP → Graph API → PostgreSQL/AGE/RLS integration, and architecture regression auditing. Do not expose unrestricted `service_role` or free-form SQL/Cypher.

## Stage 15 — GraphRAG

Combine graph traversal and pgvector retrieval through the same security boundary.

Required:

- graph retrieval
- vector retrieval
- hybrid retrieval
- tenant isolation
- cost/depth/result guardrails
- explainable retrieval metadata
- secure agent integration
- engine-neutral retrieval IR built on the existing Query IR/Schema Catalog contracts
- no tenant identity in retrieval payloads
- bounded candidate/result budgets and deterministic metadata for agent/tool use

Do not add a second vector/graph database without an explicit architecture decision. AGE and pgvector remain implementation targets behind the existing execution/security boundary.

**Status:** VALIDATED — hybrid data-plane, security, agent integration and explainability gates passed.

## Stage 16 — Observability

Add:

- structured logs
- request IDs
- metrics
- traces
- database/query timing
- mutation audit signals
- security-event visibility

Observability must not leak secrets, tenant data or raw database errors.

**Status:** IN_PROGRESS.

Implementation is on branch stage16-observability / PR #42. Focused Stage 16 CI passed on an earlier head; the final telemetry regression test and handoff documentation require a fresh green Stage 16 run before validation.

## Stage 17 — Backup + Recovery

Prove:

- backup procedures
- restore procedures
- integrity verification
- migration compatibility
- evidence-backed RPO
- evidence-backed RTO
- failure/recovery drills

**Status:** NOT STARTED.

## Stage 18 — Vibe Cloud Control Plane

Private hosted control plane for:

- project creation
- provisioning
- lifecycle
- regional topology
- resource management
- hosted observability
- backups
- operational controls

Must remain separated from OSS runtime contracts.

**Status:** DEFERRED.

## Stage 19 — Billing + Metering

Define only after runtime usage is measurable.

Potential usage dimensions:

- database/storage usage
- graph operations
- vector retrieval
- API requests
- realtime connections/events
- compute/time
- bandwidth

Exact pricing and metering semantics require product/cloud decisions.

**Status:** DEFERRED.

## Stage 20 — Production Readiness

Final gates:

- security
- tenant isolation
- authorization
- reliability
- observability
- backups/recovery
- performance
- migrations
- compatibility
- upgrade strategy
- documentation
- incident/operations readiness
- capacity/concurrency testing
- dependency/version policy

**Status:** NOT STARTED.

---

# 10. Cross-cutting engineering rules

These rules apply to every stage.

### Security

Security is a merge blocker.

Every stage that crosses a security boundary must include adversarial tests.

### Evidence

A stage is not complete because code exists.

A stage is **VALIDATED** only when:

1. implementation exists;
2. relevant tests actually ran;
3. relevant CI passed;
4. security implications were checked;
5. knowledge was updated;
6. blockers/unknowns are explicit;
7. the exit gate is satisfied;
8. the next stage is identified.

### Architecture discipline

Do not:

- introduce a second database without an explicit decision;
- expose AGE as the public contract;
- create parallel security boundaries;
- bypass RLS;
- bypass the Secure Execution Engine;
- let clients override trusted tenant context;
- accept unrestricted raw Cypher from normal clients;
- interpolate untrusted SQL/Cypher values;
- prematurely implement later stages;
- turn experimental/unknown ideas into contracts without evidence.

### Agent handoff

Every coding agent must:

1. read `AGENTS.md`;
2. read this `BUILD_PLAN.md`;
3. read `BUILD_STATE.md`;
4. inspect relevant knowledge, skills, prompts, Git history, tests and CI;
5. verify the checkpoint;
6. continue the first unfinished stage;
7. test and secure the change;
8. update knowledge;
9. update `BUILD_STATE.md) before stopping.

Conversation history is not required for a correct handoff.

---

# 11. Current execution checkpoint

See **`BUILD_STATE.md`** for the exact current checkpoint.

Current canonical checkpoint:

- Stages 00–14: **VALIDATED**
- Stage 15: **IN_PROGRESS**
- Stage 16+: **NOT STARTED / DEFERRED as individually marked**

The current implementation task is **Stage 15 — GraphRAG**. The first task is to define and test the engine-neutral hybrid retrieval contract before introducing indexes or a new public API.

The first Stage 09 action is not to code blindly. Inspect the existing Query IR, Schema Catalog, AGE compiler, Secure Execution Engine, Stage 02 security model, database fixtures and tests, then design the smallest safe mutation boundary consistent with this architecture.

---

# 12. Durable knowledge map

Use these files together:

| File | Authority |
|---|---|
| `AGENTS.md` | Engineering constitution and non-negotiable rules |
| `BUILD_PLAN.md` | Canonical architecture + sequential build plan |
| `BUILD_STATE.md` | Current execution/handoff checkpoint |
| `knowledge/architecture.md` | Durable architecture evidence and validated paths |
| `knowledge/database.md` | Database/runtime decisions and evidence |
| `knowledge/security.md` | Security policy and validation evidence |
| `knowledge/testing.md` | Testing strategy and executable evidence |
| `knowledge/decisions/unknowns-and-contradictions.md` | Open decisions, unknowns and contradictions |
| `.agents/skills/` | Stage-specific implementation constraints |
| `prompts/` | Stage-specific build prompts |

A coding agent should read the smallest relevant subset after reading the first three canonical files, but it must know that these sources exist.
