# VibePlatform Architecture

Status: **DECIDED design / not yet VALIDATED by implementation**

## Product boundary

VibePlatform is a secure developer platform that makes relational, graph, vector, realtime, and AI-agent access feel like one database.

The core remains PostgreSQL + Apache AGE + pgvector. Vibe's differentiated layer is the developer experience and secure compiler/API layer around those primitives.

## Five architectural planes

### 1. Developer Plane
User-facing and agent-facing developer surfaces:

- JavaScript SDK
- CLI
- Dashboard
- Graph Studio
- MCP
- REST/API clients

### 2. API / Compiler Plane
The Vibe abstraction and execution-control layer:

- Graph API
- Vibe Query IR
- validation engine
- query planner
- SQL compiler
- AGE/Cypher compiler
- Schema Catalog
- RAG API
- mutation engine
- policy evaluation

### 3. Data Plane
The database foundation:

- PostgreSQL
- Apache AGE
- pgvector
- RLS
- migrations
- outbox/event data

### 4. Platform Services Plane
Services reused or integrated where appropriate:

- Auth
- PostgREST
- Realtime
- Storage
- connection pooling

Supabase services are reused where they reduce unnecessary platform duplication.

### 5. Cloud Control Plane
Hosted-product operations:

- project provisioning
- lifecycle management
- billing
- metering
- backups
- observability
- regional infrastructure
- hosted operations

The Cloud Control Plane is separated from the OSS/self-hostable runtime.

## Core request architecture

```
SDK / REST / MCP / AI Agent
        ↓
     Vibe Query IR
        ↓
Schema + Security Validation
        ↓
Cost / Depth / Result Limits
        ↓
Query Planner
        ↓
AGE Compiler OR PostgreSQL Compiler
        ↓
Secure Execution
        ↓
PostgreSQL / AGE / pgvector
```

Vibe Query IR is engine-neutral. Apache AGE is an implementation detail and must not become the public application contract.

## Graph fallback

Vibe supports a PostgreSQL recursive-CTE implementation path for graph traversal.

The fallback must preserve the same Vibe Query IR contract. The exact routing rules and supported operation set remain UNKNOWN until validated.

## Schema Catalog

The Schema Catalog is the authoritative metadata layer for:

- relational schema metadata;
- graph labels;
- graph edge types;
- graph relationships;
- relevant properties;
- vector metadata;
- policy/security metadata.

It is consumed by the compiler, validation, SDK type generation, MCP and Graph Studio.

Clients and UI surfaces must not invent graph metadata.

## Security boundary

PostgreSQL/RLS is authoritative.

Tenant A must not be able to:

- read tenant B;
- update/delete tenant B;
- traverse into tenant B;
- infer tenant B through graph relationships;
- receive tenant B realtime events.

Raw Cypher is not a normal client API. Normal clients submit structured traversal specifications or other approved Query IR operations.

AI agents and MCP use scoped capabilities rather than unrestricted service_role credentials.

## Realtime architecture

Graph realtime uses minimal/ID-only events.

```
database mutation
→ outbox/trigger event
→ realtime notification
→ client receives identifiers
→ client refetches through Graph API
→ RLS is evaluated
→ UI updates
```

Realtime payloads are not the authoritative source of protected data.

## Build sequence

The repository uses the following canonical sequence:

00 Repository Bootstrap
01 PostgreSQL + AGE + pgvector Spike
02 RLS + AGE Security Spike
03 Supabase Compatibility Stack
04 Schema Catalog
05 Vibe Query IR
06 Query Validation and Cost Guardrails
07 Apache AGE Compiler
08 Secure Execution Engine
09 Graph Mutations
10 JavaScript SDK
11 CLI
12 Graph Realtime
13 Graph Studio
14 MCP Server
15 GraphRAG
16 Observability
17 Backup and Recovery
18 Vibe Cloud Control Plane
19 Billing and Metering
20 Production Readiness

Each stage must produce evidence before the next stage is treated as complete.

## Current repository state

At the time this document was aligned, the repository contained the AI development scaffold and knowledge base but did not yet contain a validated PostgreSQL/AGE/pgvector runtime.

Therefore:

- Database foundation: **NOT VALIDATED**
- Tenant security: **NOT VALIDATED**
- Query IR: **NOT VALIDATED**
- Graph API: **NOT IMPLEMENTED/VALIDATED**
- SDK: **NOT IMPLEMENTED/VALIDATED**
- Graph Studio: **NOT IMPLEMENTED/VALIDATED**
- MCP: **NOT IMPLEMENTED/VALIDATED**
- GraphRAG: **NOT IMPLEMENTED/VALIDATED**
- Cloud: **DEFERRED**

The first implementation target is Prompt 01, followed by Prompt 02.
