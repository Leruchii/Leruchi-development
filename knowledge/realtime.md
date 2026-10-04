# Realtime

- [DECIDED] Graph realtime uses a durable PostgreSQL outbox as the source of truth.
- [DECIDED] PostgreSQL NOTIFY is only a low-latency wakeup hint. If a relay misses a notification, it can recover from the outbox cursor/claim queue.
- [DECIDED] Events are ID-only/minimal: event ID, sequence, graph, operation, target kind/label/id, and timestamp. No row/property payload is broadcast.
- [DECIDED] Client subscription topics are tenant-scoped using an opaque tenant-derived key; raw tenant identifiers are not placed in public topic names.
- [DECIDED] Delivery is at-least-once. event_id is the client/server deduplication key.
- [DECIDED] Relay workers claim pending events with FOR UPDATE SKIP LOCKED, acknowledge publication only after the transport accepts the event, and retry failed delivery.
- [DECIDED] Stale claims are recoverable after a bounded lease period.
- [DECIDED] Realtime refetches through the Graph API after receiving an event. PostgreSQL RLS remains the authoritative authorization boundary.
- [DECIDED] The relay role is NOSUPERUSER/NOBYPASSRLS and is not a client capability.
- [UNKNOWN] Final hosted transport remains an adapter decision. Supabase Realtime Broadcast is a strong production candidate; the outbox/relay contract remains transport-neutral.
