# VibePlatform Architecture

Status: DECIDED design / partially VALIDATED through Stage 05

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

### 5. Cloud Control Plane

- project provisioning
- lifecycle management
- billing
- metering
- backups
- observability
- regional infrastructure
- hosted operations

## Query boundary

Vibe Query IR v1 is now validated as the engine-neutral intent contract.

Client surfaces produce IR. Later stages validate it against the Schema Catalog and security/cost policy before compilation.

The IR contains no SQL, Cypher, AGE expressions or executable fragments.

Canonicalization is deterministic: recursive key ordering, preserved array order, compact UTF-8 JSON, SHA-256 digest.

## Current validation state

- Repository bootstrap: VALIDATED
- Database foundation: VALIDATED
- Tenant security: VALIDATED
- Supabase Auth + PostgREST core: VALIDATED
- Schema Catalog: VALIDATED
- Query IR v1: VALIDATED
- Realtime: NOT IMPLEMENTED/VALIDATED
- Storage: NOT IMPLEMENTED/VALIDATED
- Pooling: NOT IMPLEMENTED/VALIDATED
- Query guardrails: NOT IMPLEMENTED/VALIDATED
- Graph compiler: NOT IMPLEMENTED/VALIDATED
- Graph API: NOT IMPLEMENTED/VALIDATED
- SDK: NOT IMPLEMENTED/VALIDATED
- Graph Studio: NOT IMPLEMENTED/VALIDATED
- MCP: NOT IMPLEMENTED/VALIDATED
- GraphRAG: NOT IMPLEMENTED/VALIDATED
- Cloud: DEFERRED

Next implementation target: Stage 06 — Query Validation + Cost Guardrails.
