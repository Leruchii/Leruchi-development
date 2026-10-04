# Stage 16 Observability

Status: IMPLEMENTED — NOT YET VALIDATED on the Stage 16 branch.

## Decision

Vibe observability is an additive runtime concern around the existing trusted request boundary. It does not become a new authorization or data-access layer.

The first OSS contract provides:
- structured logs with bounded, redaction-safe fields;
- request IDs already issued by Graph API;
- W3C traceparent parsing plus generated trace/span IDs;
- bounded metric names and labels;
- duration observations for HTTP requests, graph queries, mutations and hybrid retrieval;
- security-event counters for rejected/error HTTP requests;
- audit events enriched with trace ID and duration when supplied;
- response headers exposing request and trace IDs for operational correlation.

## Security boundary

Observability must never become a side channel for tenant data.

Telemetry sanitization:
- hashes tenant identifiers instead of emitting the raw tenant ID;
- excludes credentials, cookies, secrets, passwords, API keys and similar fields;
- excludes raw query/SQL/Cypher text;
- excludes request parameters and embeddings;
- allows only fixed metric names and a small fixed label vocabulary;
- bounds free-form label lengths.

The existing audit contract remains authoritative for governance. PostgreSQL/RLS remains authoritative for tenant isolation.

## Runtime composition

Graph API:
request -> request_id + trace context -> auth/ExecutionContext -> existing API execution -> audit + telemetry

Query/mutation/retrieval execution records timing after the existing validation/security boundary. Timing metadata does not contain query text, parameters or tenant identifiers.

## Explicit non-goals

This stage does not introduce:
- an external telemetry vendor;
- a hosted dashboard;
- a distributed metrics backend;
- a database telemetry table;
- a second logging/audit pipeline;
- client-controlled tenant telemetry labels.

Exporters and hosted observability remain deployment/cloud concerns.

## Validation evidence

The Stage 16 workflow exercises:
- observability contract tests;
- Graph API telemetry tests;
- audit contract tests;
- graph API contract tests;
- execution and mutation tests;
- architecture regression audit.

A live Stage 16 workflow run is required before this document is promoted to VALIDATED.
