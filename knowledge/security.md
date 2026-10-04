# Security

Status: DECIDED policy / Stage 03 Auth + PostgREST core validated

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
- Client-controlled tenant identifiers or GUCs must never become authoritative authorization state.

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

## Stage 03 Auth + PostgREST evidence

The Stage 03 CI workflow proves:

- Supabase Auth v2.196.0 initializes against the Vibe PostgreSQL database.
- PostgREST v14.17 connects using a limited authenticator role.
- PostgREST exposes only the explicitly allowlisted vibe_app schema.
- PostgREST verifies a signed HS256 JWT before applying its role and request claims.
- PostgreSQL RLS consumes request.jwt.claims and returns only the matching tenant rows.
- Tenant B data is not returned through the REST boundary.

The CI token is generated only to isolate the signed-JWT verification boundary. It is not a production token issuance design.

## Important remaining security questions

- The production mechanism for issuing tenant authorization claims from Supabase Auth is UNKNOWN.
- Auth user metadata must not be used as authorization state because end users can modify it.
- A production tenant claim should come from trusted app metadata or a validated custom access-token hook, with the exact design decided before shared-role production deployment.
- Realtime authorization, Storage authorization and pooler isolation require separate executable tests before being marked compatible.

Stage 04 must preserve this boundary when the Schema Catalog is introduced.
