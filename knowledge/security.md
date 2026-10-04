# Security

## Rules (from the AI Engineering Constitution examples)
- [DECIDED] PostgreSQL is the security boundary.
- [DECIDED] RLS must remain enabled.
- [DECIDED] Never use runtime superuser privileges.
- [DECIDED] Never allow unrestricted raw Cypher for normal clients.
- [DECIDED] Never give AI agents unrestricted service_role credentials; use scoped capabilities.
- [DECIDED] Security tests are merge blockers.
- [DECIDED] No infrastructure without architectural justification.
- [DECIDED] No claim a feature works without evidence.
- [DECIDED] Studio never holds browser-side service credentials; all data flows through the approved Graph API/client. Hiding a UI item is not authorisation; the backend is authoritative.
- [DECIDED] service_role bypasses RLS; the Policy Tester must not imply it can safely emulate service-role behaviour.

## Tenant isolation test plan (Prompt 02)
- [PROPOSED] Two tenants, each with users, projects, graph, data. Attack tests: A reads/updates/deletes B; A traverses into B; A infers B through graph relationships; A subscribes to B's realtime events.
- [PROPOSED] Required results: A→A allowed, A→B denied, B→A denied, automated.

## Limits
- [PROPOSED] Graph Explorer result cap default 100, maximum 1000 (Prompt 13). The AGENTS UI rules leave these blank.
- [PROPOSED] Depth bounded: UI default 2; architecture-level maximum 6. Must follow the validated backend contract.

## Open
- [UNKNOWN] RLS design for graph data stored in AGE (how row policies apply to vertices/edges).
- [UNKNOWN] Scoped-capability model for AI/MCP (scopes, issuance, revocation).
- [UNKNOWN] Auth/JWT claim model.
