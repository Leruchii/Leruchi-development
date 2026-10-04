# VibePlatform Architecture

Status: DECIDED design / partially VALIDATED through Stage 04

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

## Schema Catalog

The Schema Catalog is now validated as a versioned v1 metadata boundary.

It stores relational tables/columns, foreign-key relationships, explicitly registered graph labels/edges/properties, vector column metadata and RLS policy metadata.

The catalog is populated by a privileged migrator-owned function and exposed read-only to vibe_runtime. Later layers consume this Vibe catalog instead of reaching directly into PostgreSQL or AGE implementation catalogs.

Graph metadata remains explicitly registered; automatic graph reflection is deferred.

## Security boundary

PostgreSQL/RLS is authoritative.

Stage 01 validates the non-superuser runtime boundary.

Stage 02 validates two-tenant relational and AGE graph isolation.

Stage 03 validates Auth/PostgREST signed-JWT verification and REST-boundary tenant isolation.

Stage 04 validates that metadata discovery can be exposed to the runtime role without granting it catalog mutation privileges or superuser/BYPASSRLS access.

## Current validation state

- Repository bootstrap: VALIDATED
- Database foundation: VALIDATED
- Tenant security: VALIDATED
- Supabase Auth + PostgREST core: VALIDATED
- Schema Catalog: VALIDATED
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

Next implementation target: Stage 05 — Vibe Query IR.
