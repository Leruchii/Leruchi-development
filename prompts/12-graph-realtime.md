# Stage 12 — Graph Realtime

Build a durable, tenant-safe graph realtime boundary on top of the validated mutation model.

## Non-negotiable architecture

Mutation path:
trusted context → Mutation IR validation → AGE compiler → PostgreSQL transaction → graph mutation → outbox insert → commit → PostgreSQL NOTIFY wakeup → relay → authorized realtime transport.

Rules:
- PostgreSQL is the durable source of event truth.
- NOTIFY is only a wakeup hint; never the durable event store.
- Events are ID-only/minimal. Clients refetch through the Graph API so RLS remains authoritative.
- Tenant identity comes from trusted context.
- Realtime relay role is NOSUPERUSER/NOBYPASSRLS and is internal-only.
- Delivery is at-least-once; clients deduplicate by event_id.
- Relay claims use FOR UPDATE SKIP LOCKED.
- Crash recovery must requeue stale claims.
- A failed mutation transaction must not leave an outbox event.
- A committed mutation must have its outbox event in the same transaction.
- Cross-tenant replay/subscription must be denied.
- Subscription topics must not reveal raw tenant identifiers.

## Required exit evidence

1. Unit tests for event envelope, tenant-scoped topic, authorization and minimal payload.
2. Database migration creates the outbox with forced RLS.
3. Mutation executor inserts the outbox event before commit.
4. Commit emits a NOTIFY wakeup; rollback emits neither durable event nor notification.
5. Tenant A can read/replay only tenant A events through runtime context.
6. Tenant B cannot read/replay Tenant A events.
7. Relay can claim events concurrently without double-claiming.
8. Publish acknowledgement is idempotent.
9. Failed publish clears the claim and schedules retry.
10. Relay role cannot bypass RLS.
11. CI runs all relevant adversarial tests.
