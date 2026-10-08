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

Stage 04 catalog hardening now preserves this boundary for metadata as well as data.

## Schema Catalog metadata isolation

Graph catalog metadata has two explicit scopes: shared (`tenant_id = ''`) and tenant-owned (`tenant_id = <tenant>`). Both catalog registry and materialized catalog entries use PostgreSQL RLS with FORCE RLS. The refresh function has a dedicated migrator maintenance policy rather than bypassing RLS.

The authenticated remote Schema Catalog API verifies the bearer token before placing its trusted tenant claim into transaction-local PostgreSQL request context. The runtime database role remains NOSUPERUSER/NOBYPASSRLS, so catalog visibility is enforced by the database rather than by the HTTP layer alone.

Adversarial CI must prove Tenant A cannot see Tenant B's private graph name, label, edge or catalog metadata, while both can see shared metadata.


## Stage 32 — Supabase tenant-claim issuance boundary (IMPLEMENTED, end-to-end issuance still unvalidated)

The self-hosted Supabase Auth configuration enables the custom access-token hook at `vibe_auth.custom_access_token_hook`. The hook derives the top-level `tenant_id` claim only from `vibe_auth.user_tenant_memberships`.

Security contract:
- `user_metadata.active_tenant_id` is only a requested tenant selector; it is not authorization evidence.
- The hook removes any existing top-level `tenant_id` before resolving membership.
- A requested tenant is issued only if the user has an active membership for that tenant.
- Without an explicit selector, the hook resolves a sole active membership or a unique active default membership.
- Revoked, unknown or ambiguous tenant selections result in no `tenant_id` claim.
- The membership table is private, has RLS enabled and forced, and grants SELECT only to `supabase_auth_admin`; the hook uses invoker permissions rather than SECURITY DEFINER.
- PostgREST continues to expose only the `vibe_app` schema; normal API roles cannot read the membership table.

The Stage 03 workflow applies the hook after Supabase Auth initializes and checks its function/table grants and fail-closed behavior. This is not yet proof of a complete production identity-provider issuance path: the hook must still be validated through an actual Auth-issued access token in the supported deployment configuration, including issuer/audience/signature and token-refresh/revocation semantics. Keep the production tenant-claim blocker open until that evidence exists.
