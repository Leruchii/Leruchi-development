# Security

Status: DECIDED policy / Stage 02 tenant isolation validated

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

The runtime role is NOSUPERUSER and NOBYPASSRLS. Executable graph and vector operations are performed through that role.

## Stage 02 evidence

The adversarial suite uses two non-superuser, non-BYPASSRLS tenant-bound database roles.

Relational RLS proves:

- Tenant A reads only A.
- Tenant A cannot read B.
- Tenant A cannot update B.
- Tenant A cannot delete B.
- Tenant B cannot read, update or delete A.

AGE RLS proves:

- Tenant A sees only A graph vertices/edges.
- Tenant B sees only B graph vertices/edges.
- Tenant A cannot directly read B graph vertices.
- Tenant B cannot directly read A graph vertices.
- Tenant A can traverse A -> A.
- Tenant A cannot traverse A -> B.
- An intentionally cross-tenant A -> B edge does not expose B through graph inference.

All tested tenant roles are NOSUPERUSER and NOBYPASSRLS.

## Important limitation

Tenant context propagation from Auth/JWT into a shared runtime role is NOT resolved here. The spike uses tenant-bound database roles so the database enforcement itself can be tested without treating a client-controlled session GUC as trusted.

Stage 03 must resolve how Auth/PostgREST establishes trusted tenant context without weakening the database boundary.
