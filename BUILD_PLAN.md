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

## 3A. Agent action and developer experience priority

VibeDB must support two complementary usage modes without creating separate database semantics:

1. **Developer-first:** SDK, REST/Graph API, SQL/PostgreSQL compatibility, CLI and Studio provide ergonomic direct access.
2. **Agent-first:** MCP and AI agents can read data and, when explicitly authorized, create/update/delete data and relationships on behalf of a human.

Both modes converge on the same trusted contracts:

```
Developer / Agent / MCP
          ↓
Query IR or Mutation IR
          ↓
identity + capability + Schema Catalog validation
          ↓
cost / depth / mutation safety / approval policy
          ↓
Planner / compiler
          ↓
Secure Execution Engine
          ↓
PostgreSQL / AGE / pgvector / RLS
          ↓
normalized result + audit/outbox metadata
```

MCP is never a privileged bypass. Tenant identity comes from trusted authentication context; capabilities are scoped; destructive actions require explicit approval semantics; auditability is mandatory. The developer experience must remain usable without exposing internal compiler or engine details.

This is a durable architecture priority for all future stages.

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

**Status:** VALIDATED.

PR #42 merged as `e3926c7a14a524b08266f7e45d69b2d74a025cbc`. Dedicated observability, Graph API telemetry, audit, execution, mutation and architecture checks passed. The GitHub Advanced Security external Processing Request failure is tracked as infrastructure/tooling noise rather than a VibeDB regression.

## Stage 17 — Backup + Recovery

Prove:

- backup procedures
- restore procedures
- integrity verification
- migration compatibility
- evidence-backed RPO
- evidence-backed RTO
- failure/recovery drills

**Status:** VALIDATED.

Validation evidence:
- PostgreSQL custom-format backup plus SHA-256 and byte-size manifest verification;
- explicit `fresh` and `replace` restore modes;
- migration-ledger equality after restore;
- production-image restore using PostgreSQL 17.11 + Apache AGE 1.7.0 + pgvector 0.8.7;
- restored AGE graph data and pgvector-backed data;
- recovery-point proof that pre-backup data is present and a post-backup write is absent;
- Stage 17 workflow run `37289351363` passed with a production-image reference backup duration of 232 ms and restore duration of 146 ms.

The measured timings are controlled CI benchmark evidence, not a hosted-service SLA. Numeric operational RPO depends on backup cadence and hosted topology; commercial/hosted RPO and RTO targets, retention, replication and regional recovery belong to Stage 18 rather than the OSS runtime contract.

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

**Status:** VALIDATED.

Validation evidence: commit `139966a5a4a6a432d00a1924c967dabb969b3908`; Stage 20 workflow `37297799623`, Stage 11 `37297799604`, Stage 12 `37297799687`, Stage 15 `37297799696`, Architecture Regression Audit `37297799715`, and Stage State Gate `37297799678` all passed. The upgrade drill proved prior-schema compatibility, checksum persistence/drift rejection, data preservation and idempotent rerun; the concurrency smoke proved bounded reference-pool behavior under 32 concurrent tasks.

Stage 20 is the validated OSS production-readiness baseline. Stage 21 is now explicitly approved as the engine-neutral planner and PostgreSQL fallback foundation; it must preserve all Stage 20 security, reliability and operational guarantees.

Stage 20 starts from the validated Stage 00–17 evidence and must not duplicate security or execution boundaries. The initial production-readiness audit adds executable dependency/version and migration-policy enforcement. Remaining open gates are a supported-schema upgrade drill, capacity/concurrency evidence, current operations/testing/unknowns documentation, durable incident/upgrade procedures, and a final repository-wide regression pass.

Stages 18 and 19 remain DEFERRED and do not block the OSS production-readiness work; hosted/cloud SLA and billing semantics remain separated from the runtime contract.

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

The canonical execution checkpoint is **Stage 22 — Retrieval-Aware Engine-Neutral Planner**.

Current state:
- Stages 00–21: **VALIDATED**.
- Stages 18 — Vibe Cloud Control Plane and 19 — Billing + Metering: **DEFERRED**.
- Stage 22: **VALIDATED** and merged to `main` as `c6f0c41025f52ad14bc30be97adeeff4edaf2593`.
- Final exact Stage 22 candidate `e80f9bc91ed275ff2e6051d27fc32c003bb9209` passed all 21 triggered repository workflows; Architecture Regression Audit and Stage State Gate also passed.
- A real shared retrieval execution defect was fixed: `plan` was referenced before initialization, breaking both Stage 22 tests and the existing Stage 15 hybrid integration. The fix initializes the plan immediately after Retrieval IR validation and before execution branches.
- The canonical handoff is maintained in `BUILD_STATE.md`.

Stage 20 exit evidence must include:
1. executable version/dependency and migration policy;
2. supported prior-schema → current upgrade evidence;
3. bounded capacity/concurrency evidence with a clearly non-SLA reference envelope;
4. current operations/testing/unknowns documentation;
5. durable incident, upgrade, rollback/recovery and dependency-update runbooks;
6. final repository-wide regression evidence;
7. explicit separation of OSS guarantees from cloud-only operational commitments.

All Stage 20 exit gates have executable evidence. Do not claim universal capacity, hosted SLA, regional recovery, commercial RPO/RTO, billing, or cloud-control-plane guarantees from OSS validation.

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


## Stage 20 — Final validation record

Stage 20 production readiness is validated on the corrected head `139966a5a4a6a432d00a1924c967dabb969b3908`. A migration-runner checksum persistence defect was found during the full matrix and fixed by replacing ineffective psql variable substitution with strictly validated SQL literals. The corrected head passed the full relevant repository matrix and architecture/state gates.

Stages 18 and 19 remain intentionally deferred. Stage 21 is the current validated OSS engine-neutral planner and PostgreSQL fallback foundation.
## Stage 21 — Engine-Neutral Planner + PostgreSQL Fallback Foundation

**Status:** VALIDATED.

Stage 21 makes engine selection explicit while preserving Query IR as the public read contract.

### 21.1 Durable agent/developer priority

- MCP supports both read/retrieval and authorized write/action workflows.
- Agent writes use Mutation IR, scoped capabilities, tenant/RLS enforcement, mutation approval and audit.
- Developers remain first-class users through SDK, REST/Graph API, SQL/PostgreSQL compatibility, CLI and Studio.
- No client needs to understand AGE, Cypher, recursive CTEs or planner internals.

### 21.2 Planner and recursive fallback

Validated implementation:
- capability-driven deterministic planner;
- explicit Apache AGE preferred path;
- explicit PostgreSQL recursive fallback target;
- no silent fallback;
- planner does not authorize, compile or execute;
- constrained Query IR to PostgreSQL recursive CTE compiler;
- explicit Schema Catalog relational mappings;
- trusted transaction JWT tenant context;
- canonical JSON parameter binding;
- traversal cycle protection;
- bounded depth, result limit and offset;
- parameterized filters/projections/order expressions;
- no raw SQL/Cypher input.

### 21.3 Exit evidence

Final-head evidence:
- compiler contract tests;
- live PostgreSQL/RLS traversal, tenant isolation, depth, result-limit and parameter-injection tests;
- AGE vs PostgreSQL recursive normalized-result equivalence fixture;
- Graph API planner integration with validation before planner/compiler selection;
- bounded planner telemetry containing only engine/reason;
- full repository regression matrix;
- Architecture Regression Audit and Stage State Gate green.

Final validation head: `97d7bdaae2fe24f16c6486cee0ef9f167e72f682`.
Merged to main: `c7422314cf36ea1d58cbcac1d5686b6802f67824`.

PostgreSQL recursive fallback remains explicitly registered and capability-gated; Apache AGE remains the default execution path. Stages 18 and 19 remain deferred.

## Stage 22 — Retrieval-Aware Engine-Neutral Planner

**Status:** VALIDATED.

Stage 22 extends the planner boundary from graph-only execution to vector and hybrid retrieval without creating a second execution/security path.

### 22.1 Decision

- Retrieval IR v1 remains the engine-neutral retrieval contract.
- The planner validates retrieval shape at the existing retrieval boundary, then selects execution targets from explicitly registered capabilities.
- Vector execution targets PostgreSQL/pgvector through the existing secure retrieval execution path.
- Graph execution may select Apache AGE or the capability-gated PostgreSQL recursive compiler.
- Hybrid retrieval produces a two-target plan (graph + vector); deterministic weighted-RRF fusion remains above the physical source engines.
- No silent engine fallback is allowed.

### 22.2 Implementation

Implemented on `stage22-retrieval-planner`:
- `packages/planner/retrieval.mjs` deterministic retrieval planner;
- explicit retrieval engine capability registry;
- retrieval-execution integration with planned graph compiler selection;
- planner output included in normalized retrieval metadata;
- focused planner and retrieval execution tests;
- Stage 22 CI gate.

### 22.3 Exit gate

Before validation, prove:
- vector-only, graph-only and hybrid plans are deterministic;
- unavailable/missing capabilities fail closed;
- recursive graph fallback is selected only when explicitly registered/preferred;
- planner selection does not bypass trusted ExecutionContext, Schema Catalog, RLS, cost or result limits;
- hybrid fusion remains deterministic and source identity-safe;
- Stage 22 CI and the repository regression matrix pass.

Validation evidence:
- Final candidate `6f094147821b1e2802884fe4bf879f24bb302741` passed all 21 triggered repository workflows.
- Stage 22 workflow `37314794551` passed.
- Stage 15 GraphRAG workflow `37314794593` passed, including the live PostgreSQL/AGE/pgvector hybrid database job.
- Architecture Regression Audit `37314794555` and Stage State Gate `37314794572` passed.
- The shared `plan` initialization defect was fixed before validation and its regression impact on Stage 15 was explicitly re-exercised.


## Stage 23 — Unified Retrieval Developer/Agent Surface

**Status:** VALIDATED.

Stage 23 is the next OSS stage. Its purpose is to make the validated Stage 22 retrieval planner a first-class developer and agent capability without exposing physical engine details or creating another execution/security boundary.

Required direction:
- expose engine-neutral retrieval through the developer-facing SDK/API/CLI contracts where retrieval is currently available only through lower-level execution paths;
- expose the same retrieval intent to MCP/agents using the canonical Retrieval IR and existing scoped capabilities;
- preserve trusted ExecutionContext, Schema Catalog, RLS, cost/result guardrails, deterministic weighted-RRF and Secure Execution Engine semantics;
- provide bounded, explainable plan metadata without exposing SQL/Cypher, tenant identifiers, embeddings, raw parameters or internal credentials;
- prove developer and MCP retrieval paths converge on the same validation/planner/execution semantics;
- add adversarial tests for tenant override, capability misuse, unsafe identifiers and plan-metadata leakage.

Do not introduce a new database, a second retrieval execution path, or a public physical-engine contract.


## Stage 24 — Retrieval Explainability, Evaluation & Agent-Safety Boundary

**Status:** READY_TO_DEFINE.

Stage 23 makes retrieval consumable through the same developer and agent contract. The next architectural step should not add another retrieval engine or execution path. It should make retrieval behavior inspectable, testable and safe for production AI-agent use.

Target direction:
- bounded retrieval explain/evaluation semantics over the existing Retrieval IR and Stage 22 planner;
- deterministic reason codes for validation, capability denial, planner selection and guardrail rejection;
- agent-safe diagnostics that never expose SQL/Cypher, tenant identifiers, embeddings, raw parameters, credentials or unrestricted catalog internals;
- golden evaluation fixtures proving SDK, CLI and MCP produce equivalent retrieval intent and bounded outcomes;
- adversarial agent tests for prompt-driven capability escalation, cross-tenant inference, metadata leakage and unbounded retrieval requests;
- observability correlation between request ID, retrieval mode, planner decision and execution outcome without sensitive payload capture;
- preserve one validation → planner → secure execution path.

Do not introduce an LLM planner, autonomous authorization, a second retrieval executor, or a public physical-engine contract.
