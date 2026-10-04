# Realtime

- [DECIDED] Graph realtime events are ID-only.
- [DECIDED] Flow: database mutation → ID-only event → Studio receives → Studio refetches via Graph API → RLS → updated UI.
- [DECIDED] The UI must not treat realtime payloads as authoritative data.
- [PROPOSED] Test that tenant A cannot subscribe to tenant B events.
- [UNKNOWN] Transport, channel model, event schema, delivery guarantees.
