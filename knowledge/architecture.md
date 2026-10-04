# VibePlatform Architecture

Status: DECIDED design / partially VALIDATED through Stage 03

## Product boundary

VibePlatform is a secure developer platform that makes relational, graph, vector, realtime, and AI-agent access feel like one database.

The core remains PostgreSQL + Apache AGE + pgvector. Vibe's differentiated layer is the developer experience and secure compiler/API layer around those primitives.

## Five architectural planes

### 1. Developer Plane

- JavaScript SDK
- CLI
- Dashboard
- Graph Studio
- MCP
- REST/API clients

### 2. API / Compiler Plane

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

- PostgreSQL
- Apache AGE
- pgvector
- RLS
- migrations
- outbox/event data

### 4. Platform Services Plane

- Auth
- PostgREST
- Realtime
- Storage
- connection pooling

Supabase services are reused where they reduce unnecessary platform duplication.

### 5. Cloud Control Plane

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

SDK / REST / MCP / AI Agent
→ Vibe Query IR
→ Schema + Security Validation
→ Cost / Depth / Result Limits
→ Query Planner
→ AGE Compiler OR PostgreSQL Compiler
→ Secure Execution
→ PostgreSQL / AGE / pgvector

Vibe Query IR is engine-neutral. Apache AGE is an implementation detail.

## Graph fallback

Vibe supports a PostgreSQL recursive-CTE implementation path for graph traversal.

The fallback must preserve the same Vibe Query IR contract. Exact routing rules and supported operations remain UNKNOWN.

## Schema Catalog

The Schema Catalog is the authoritative metadata layer for relational schema, graph labels, graph edge types, graph relationships, relevant properties, vector metadata and policy/security metadata.

It is consumed by the compiler, validation, SDK type generation, MCP and Graph Studio.

## Security boundary

PostgreSQL/RLS is authoritative.

Stage 01 validates the non-superuser runtime boundary.

Stage 02 validates two-tenant relational and AGE graph isolation, including cross-tenant read/update/delete denial and graph inference denial through a deliberately cross-tenant edge.

Stage 03 validates the Auth/PostgREST compatibility boundary: Auth can initialize against the Vibe database, PostgREST can verify a signed JWT, verified request.jwt.claims can reach PostgreSQL RLS, and tenant_a cannot see tenant_b through the REST boundary.

The Stage 03 JWT/RLS probe signs a test token inside CI to isolate PostgREST verification and RLS behavior. The exact production mechanism for issuing tenant authorization claims from Auth remains UNKNOWN.

## Realtime architecture

Graph realtime uses minimal/ID-only events. Database mutation → outbox/trigger event → realtime notification → client refetch through Graph API → RLS → UI.

Realtime payloads are not authoritative protected data.

## Build sequence

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

## Current validation state

- Repository bootstrap: VALIDATED
- Database foundation: VALIDATED
- Tenant security: VALIDATED through adversarial Stage 02 tests
- Supabase Auth + PostgREST core: VALIDATED through Stage 03 CI
- Realtime: NOT IMPLEMENTED/VALIDATED
- Storage: NOT IMPLEMENTED/VALIDATED
- Pooling: NOT IMPLEMENTED/VALIDATED
- Query IR: NOT IMPLEMENTED/VALIDATED
- Graph API: NOT IMPLEMENTED/VALIDATED
- SDK: NOT IMPLEMENTED/VALIDATED
- Graph Studio: NOT IMPLEMENTED/VALIDATED
- MCP: NOT IMPLEMENTED/VALIDATED
- GraphRAG: NOT IMPLEMENTED/VALIDATED
- Cloud: DEFERRED

Next implementation target: Stage 04 — Schema Catalog.
