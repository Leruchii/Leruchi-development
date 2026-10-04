# Stage 10 — JavaScript SDK

## Decision

The SDK is a thin developer-plane boundary over the already validated Query IR v1 and Mutation IR v1 contracts.

It does not compile queries, enforce tenant authorization, consult the Schema Catalog, or execute database credentials. Those remain server responsibilities.

## API shape

The SDK exposes:
- `createClient()`
- `client.graph(graph)`
- query builder methods for root selection, traversal, filters, projections, ordering, pagination and typed parameter binding;
- mutation methods for create/update/delete vertex and edge;
- injectable transport for deterministic testing;
- default HTTP transport using Vibe graph query/mutation routes.

## Security

The SDK never accepts raw Cypher/SQL and never accepts tenant identity as an authorization input. Client-side validation is fail-fast UX only; server validation/RLS remains authoritative.

## Scope boundary

The default HTTP route names are a transport contract for the SDK. Their server implementation is intentionally not claimed as Stage 10 validation evidence; Graph API/runtime integration must validate those routes when the corresponding API surface exists.

## Status

IMPLEMENTED — NOT YET VALIDATED
