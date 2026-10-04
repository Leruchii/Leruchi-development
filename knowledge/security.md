# Security

Status: **DECIDED policy / NOT VALIDATED by implementation**

## Non-negotiable rules

- PostgreSQL is the security boundary.
- RLS must remain enabled where tenant isolation depends on it.
- Runtime application paths must not require superuser privileges.
- Normal clients must not receive unrestricted raw Cypher.
- AI agents must not receive unrestricted service_role credentials.
- AI/MCP access uses scoped capabilities.
- Security tests are merge blockers.
- UI visibility is never authorisation.
- No success claim without executable evidence.

## Tenant isolation

Prompt 02 must create automated adversarial tests for at least two tenants.

Required assertions:

- Tenant A can access A's allowed data.
- Tenant A cannot read B.
- Tenant A cannot update B.
- Tenant A cannot delete B.
- Tenant A cannot traverse into B's graph.
- Tenant A cannot infer B through graph relationships.
- Tenant A cannot receive B's realtime events once realtime is implemented.
- Tenant B cannot access A.

The exact AGE/RLS enforcement mechanism is an implementation question that must be validated rather than assumed.

## Agent capabilities

The exact scope model, issuance, revocation and audit format remain UNKNOWN. Do not invent an unrestricted service-role workaround.

## Limits

Initial proposed Graph Studio limits:

- default depth: 2
- architecture maximum depth: 6
- default result cap: 100
- maximum result cap: 1000

These values are provisional until backend validation establishes the actual contract.
