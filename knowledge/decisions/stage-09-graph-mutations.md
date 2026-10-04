# Stage 09 — Graph Mutation Decisions

## Mutation IR boundary

Graph writes use a separate Mutation IR v1 rather than extending Query IR with write semantics. This prevents a read-only validator/compiler path from becoming an accidental mutation API.

## Tenant authority

The caller supplies no authoritative tenant identifier. The trusted execution context supplies tenant identity; the compiler injects it as `tenant_id`. Supplying `tenant_id` in mutation properties is rejected.

Create-edge mutations require both endpoint vertices to be visible to the trusted tenant before the edge is created. PostgreSQL RLS remains authoritative on the AGE label/edge tables.

## Capabilities

All graph mutations require `graph:write`. Delete operations additionally require `graph:delete`. `service_role` remains restricted to trusted backend execution.

## Conflict semantics

Mutation IR v1 does not introduce optimistic versioning. Mutations execute against the tenant-visible current state in one PostgreSQL transaction. Zero matching targets are safe no-ops; concurrent updates rely on PostgreSQL transaction/row-lock behavior, with last-writer-wins for conflicting property updates.

## Audit boundary

Mutation results carry a request ID and normalized audit metadata (tenant, graph, operation, target). Durable outbox/event persistence is intentionally deferred to Stage 12.

## Validation status

Implementation is present but remains `IMPLEMENTED — NOT YET VALIDATED` until Stage 09 CI passes, including database-backed RLS/adversarial tests.