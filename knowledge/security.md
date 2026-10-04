# Security

Status: DECIDED policy / Stage 01 runtime privilege boundary validated

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

## Stage 01 evidence

The runtime role is explicitly NOSUPERUSER and NOBYPASSRLS. Executable graph and vector operations are performed through that role.

Apache AGE 1.7.0 for PG17 includes RLS support and improved permission checks. The PG17 AGE release is therefore the current baseline for tenant-security work.

## Stage 02 required validation

Two-tenant adversarial tests must prove:

- Tenant A can access A's allowed data.
- Tenant A cannot read B.
- Tenant A cannot update B.
- Tenant A cannot delete B.
- Tenant A cannot traverse into B's graph.
- Tenant A cannot infer B through graph relationships.
- Tenant B cannot access A.

The exact AGE/RLS enforcement mechanism must be demonstrated by tests rather than assumed.
