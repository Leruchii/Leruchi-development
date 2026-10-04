# Stage 12 — Graph Realtime

## Durable event boundary

Graph mutations and their realtime event record must commit atomically in the same PostgreSQL transaction.

The outbox is the durable source of truth. PostgreSQL NOTIFY carries only the outbox event ID as a wakeup signal; losing a notification does not lose the event because the relay can replay pending outbox rows.

## Event contract

v1 events contain:
- event_id
- event_seq
- event_type
- tenant-scoped graph
- mutation operation
- target kind
- target label
- target ID
- occurred_at

No row properties, secrets, JWTs or raw mutation payloads are broadcast.

## Delivery semantics

Realtime delivery is at-least-once. A relay marks an event published only after the transport accepts it. Crashes between publish and acknowledgement may cause duplicates, so event_id is the deduplication key.

Relay workers use PostgreSQL FOR UPDATE SKIP LOCKED to claim queue rows concurrently. Claims expire after a bounded lease and can be retried. Failed publication records a bounded error and future availability time.

## Authorization

Subscription authorization requires a trusted tenant context and a Schema Catalog graph definition. Topic names use an opaque tenant-derived key rather than the raw tenant identifier.

Clients never use the realtime event as authoritative data. They refetch the affected graph object through the Graph API, where PostgreSQL RLS applies.

## Role model

The realtime relay has a dedicated login role:
- NOSUPERUSER
- NOBYPASSRLS
- no graph mutation permissions

It has only the outbox maintenance privileges required to claim/read/ack events.

## Transport

The outbox and relay are transport-neutral. Supabase Realtime Broadcast is the preferred hosted transport candidate because it supports private channels and authorization, while the OSS contract does not depend on Supabase-specific event payloads.

## Validation

Stage 12 is VALIDATED by fresh workflow run `37210250276` after replay/topic hardening.
- atomic mutation + outbox commit;
- rollback leaves no event;
- commit emits the wakeup;
- tenant A cannot replay tenant B events;
- relay claim/ack/retry works;
- relay cannot bypass RLS;
- event payload remains minimal.
