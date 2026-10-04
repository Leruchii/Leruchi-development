# VibePlatform AI Engineering Constitution

VibePlatform is a secure developer platform that makes relational, graph, vector, realtime, and AI-agent access feel like one database.

This file is the top-level engineering contract for coding agents. It governs architecture, security, implementation order, evidence, and UI work.

## 1. Core architecture

VibePlatform is organised into five planes:

1. **Developer Plane** — JavaScript SDK, CLI, Dashboard, Graph Studio, MCP and REST surfaces.
2. **API / Compiler Plane** — Graph API, Query IR, validation, planner, compilers, Schema Catalog, RAG API, mutation engine and policy evaluation.
3. **Data Plane** — PostgreSQL, Apache AGE, pgvector, RLS, migrations and outbox/event data.
4. **Platform Services Plane** — Auth, PostgREST, Realtime, Storage and connection pooling, reusing Supabase services where appropriate.
5. **Cloud Control Plane** — project lifecycle, provisioning, metering, billing, backups, observability, regions and hosted operations.

The public product contract must not depend directly on Apache AGE. AGE is an implementation detail behind Vibe abstractions.

## 2. Core database rules

- PostgreSQL is the system of record and the primary security boundary.
- Apache AGE provides graph execution.
- pgvector provides vector search.
- Versions must be pinned.
- Runtime application paths must not require PostgreSQL superuser privileges.
- RLS must remain enabled wherever tenant/user isolation depends on it.
- Do not add Neo4j, ArangoDB, Pinecone, a second graph engine, or another database without an explicit architecture decision.

## 3. Query boundary

All graph-capable client surfaces converge on Vibe Query IR.

Canonical flow:

```
SDK / REST / MCP / AI Agent
        ↓
     Query IR
        ↓
Schema + security validation
        ↓
Cost / depth / limit validation
        ↓
Query planner
        ↓
AGE compiler or PostgreSQL compiler
        ↓
Secure execution
        ↓
PostgreSQL / AGE
```

Rules:

- Query IR is engine-neutral.
- The backend owns compilation.
- Normal clients never submit unrestricted raw Cypher.
- Raw Cypher, if supported, is limited to explicitly trusted backend/service roles.
- Parameterise values; never build SQL/Cypher by concatenating untrusted strings.
- The recursive-CTE PostgreSQL path is a fallback implementation, not a second public API.

## 4. Schema Catalog

The Schema Catalog is the authoritative source for relational, graph and vector metadata consumed by:

- Graph API
- validation
- compilers
- SDK type generation
- MCP
- Graph Studio
- GraphRAG

Studio and agents must not invent schema metadata independently.

## 5. Security is a merge blocker

Tenant isolation is non-negotiable.

A tenant must not be able to:

- read another tenant's rows;
- update or delete another tenant's rows;
- traverse into another tenant's graph data;
- infer another tenant's data through graph relationships;
- receive another tenant's realtime events.

Security requirements:

- PostgreSQL/RLS enforcement is authoritative.
- UI hiding is never authorisation.
- service_role bypasses RLS and must never be handed unrestricted to normal clients or AI agents.
- AI/MCP operations use scoped capabilities.
- Destructive agent operations require an explicit workflow such as dry-run/diff/impact review/approval/audit.
- Security tests block merging when they fail.

## 6. Realtime

Graph realtime events are ID-only/minimal events.

Preferred flow:

```
database mutation
→ outbox/trigger event
→ realtime notification with identifiers
→ client refetches through Graph API
→ RLS applies
→ UI updates
```

Do not place sensitive row/graph payloads directly in realtime events.

## 7. Supabase compatibility

Reuse Supabase services where they help the product instead of reimplementing them prematurely:

- Auth
- PostgREST
- Realtime
- Storage
- pooler / connection infrastructure

Vibe's differentiated layer is the graph/vector/compiler/security developer experience, not a wholesale rewrite of Supabase.

## 8. OSS and Cloud separation

The open-source repository contains the self-hostable product/runtime and developer tooling.

The private Vibe Cloud control plane may contain hosted provisioning, billing, metering, regional orchestration and commercial operations.

Do not leak private-cloud-only dependencies into the OSS runtime contract.

## 9. Canonical build order

Build stages are sequential unless an explicit architecture decision changes them:

00. Repository Bootstrap
01. PostgreSQL + AGE + pgvector Spike
02. RLS + AGE Security Spike
03. Supabase Compatibility Stack
04. Schema Catalog
05. Vibe Query IR
06. Query Validation and Cost Guardrails
07. Apache AGE Compiler
08. Secure Execution Engine
09. Graph Mutations
10. JavaScript SDK
11. CLI
12. Graph Realtime
13. Graph Studio
14. MCP Server
15. GraphRAG
16. Observability
17. Backup and Recovery
18. Vibe Cloud Control Plane
19. Billing and Metering
20. Production Readiness

Do not implement later stages simply because they are interesting.

## 10. First technical milestone

Before dashboard, MCP, GraphRAG, billing or cloud work, prove:

- PostgreSQL starts;
- AGE loads;
- pgvector loads;
- versions are pinned;
- runtime roles are separated;
- graph creation works;
- vertex/edge creation and traversal work;
- vector storage/query works;
- two-tenant RLS isolation works;
- adversarial cross-tenant graph tests fail closed.

## 11. Agent workflow

Before coding:

1. Read this file.
2. Read the relevant `knowledge/*.md` files.
3. Load the relevant `.agents/skills/*/SKILL.md` files.
4. Inspect the repository and existing tests.
5. Identify the current build stage.
6. Make the smallest change that completes that stage.
7. Run the relevant tests.
8. Update knowledge/decisions when a new fact is learned.

When finished, report:

- what changed;
- files changed;
- commands/tests executed;
- results;
- architecture decisions discovered;
- security implications;
- unresolved UNKNOWN items;
- the next stage.

Never claim a feature works without evidence from an executed test or verified runtime check.

## 12. Knowledge states

Use these statuses consistently:

- DECIDED — approved design decision.
- VALIDATED — proven by executable evidence.
- PROPOSED — candidate design awaiting approval/proof.
- EXPERIMENTAL — being tested; not a contract.
- DEFERRED — intentionally later.
- REJECTED — intentionally not used.
- UNKNOWN — insufficient evidence/decision.

Do not silently convert UNKNOWN or PROPOSED items into product contracts.

## 13. UI constitution

UI work additionally follows `.agents/skills/vibe-ui/SKILL.md`.

Core UI constraints:

- Next.js + React + TypeScript.
- Tailwind CSS v4.
- shadcn/ui backed by Base UI.
- Do not introduce Radix.
- Semantic OKLCH tokens only; no component-local hex/rgb/Tailwind palette colours.
- Type A Settings/Form, Type B Data, Type C Canvas.
- Loading, empty and error states are required.
- Test 360px, 768px and 1440px; dark and light themes.
- Graph query UI must not expose unrestricted free-form Cypher to normal users.
- Run `scripts/audit-baseui.sh src` once that script exists in the UI stage.

## 14. Do not overbuild

Until justified by evidence, do not add:

- automatic graph reflection;
- AI-generated production schemas;
- dynamic multi-engine routing;
- distributed cache layers;
- multi-engine optimisers;
- automatic index advisors;
- unrelated microservices.

Prefer a small, auditable PostgreSQL-centred implementation.


## 15. Repository handoff protocol

Conversation history is not the project source of truth. The repository is.

Before coding, every agent must read `BUILD_PLAN.md` and `BUILD_STATE.md` in addition to this constitution, then verify the checkpoint against recent Git history, implementation, tests and relevant CI workflows. If the checkpoint conflicts with executable repository evidence, the evidence wins and `BUILD_STATE.md` must be corrected.

Agents must continue the first unfinished canonical stage rather than restarting validated stages or jumping ahead. Existing partial branches, commits, pull requests and tests must be inspected before replacing work.

Before ending a work session, update `BUILD_STATE.md` with the current stage and status, last validated commit, branch or pull request when applicable, completed work, remaining work, tests and CI status, blockers, decisions, changed packages/files, and the exact next action. Another agent must be able to continue without asking the user what happened.

Use the checkpoint status vocabulary defined in `BUILD_STATE.md`. Code that exists without the required executable evidence is `IMPLEMENTED — NOT YET VALIDATED`, not `VALIDATED`.
