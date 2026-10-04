# Stage 11 — CLI

## Decision

The CLI is a thin developer-plane wrapper over the validated JavaScript SDK and Schema Catalog contracts.

## Security boundary

The CLI does not:
- compile Query IR or Mutation IR;
- authorize tenants;
- accept raw Cypher or SQL for graph operations;
- store bearer tokens in project configuration;
- bypass PostgreSQL RLS.

Authentication is supplied through environment-controlled `VIBE_TOKEN`. Project configuration stores only non-secret connection metadata.

## Current implementation

Validated CLI workflows:
- base URL configuration;
- graph query delegation;
- graph mutation delegation;
- local catalog type generation;
- diagnostics;
- local Docker Compose status.

## Remaining

The repository does not yet have a durable migration execution contract or a validated remote Schema Catalog HTTP contract. Those must be established before Stage 11 can be marked VALIDATED.

Status: IMPLEMENTED — NOT YET VALIDATED.
