CREATE SCHEMA IF NOT EXISTS vibe_auth AUTHORIZATION postgres;

CREATE TABLE IF NOT EXISTS vibe_auth.user_tenant_memberships (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id text NOT NULL CHECK (btrim(tenant_id) <> '' AND length(tenant_id) <= 128),
  membership_status text NOT NULL DEFAULT 'active'
    CHECK (membership_status IN ('active', 'revoked')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_tenant_memberships_one_active_default
  ON vibe_auth.user_tenant_memberships (user_id)
  WHERE membership_status = 'active' AND is_default;

ALTER TABLE vibe_auth.user_tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_auth.user_tenant_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_hook_reads_memberships
  ON vibe_auth.user_tenant_memberships;
CREATE POLICY auth_hook_reads_memberships
  ON vibe_auth.user_tenant_memberships
  FOR SELECT
  TO supabase_auth_admin
  USING (true);

REVOKE ALL ON SCHEMA vibe_auth FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA vibe_auth TO supabase_auth_admin;
REVOKE ALL ON TABLE vibe_auth.user_tenant_memberships
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE vibe_auth.user_tenant_memberships TO supabase_auth_admin;

CREATE OR REPLACE FUNCTION vibe_auth.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog
AS $hook$
DECLARE
  claims jsonb := COALESCE(event->'claims', '{}'::jsonb);
  hook_user_id uuid;
  requested_tenant_id text;
  resolved_tenant_id text;
  active_membership_count bigint;
  default_membership_count bigint;
BEGIN
  -- Never preserve a tenant claim supplied by another metadata or token source.
  claims := claims - 'tenant_id';

  IF event->>'user_id' IS NULL THEN
    RETURN jsonb_build_object('claims', claims);
  END IF;

  hook_user_id := (event->>'user_id')::uuid;
  -- User metadata is only a tenant selector. Membership lookup below is authoritative.
  requested_tenant_id := NULLIF(claims #>> '{user_metadata,active_tenant_id}', '');

  IF requested_tenant_id IS NOT NULL THEN
    SELECT membership.tenant_id
      INTO resolved_tenant_id
      FROM vibe_auth.user_tenant_memberships AS membership
     WHERE membership.user_id = hook_user_id
       AND membership.tenant_id = requested_tenant_id
       AND membership.membership_status = 'active';
  ELSE
    SELECT count(*)
      INTO active_membership_count
      FROM vibe_auth.user_tenant_memberships AS membership
     WHERE membership.user_id = hook_user_id
       AND membership.membership_status = 'active';

    IF active_membership_count = 1 THEN
      SELECT membership.tenant_id
        INTO resolved_tenant_id
        FROM vibe_auth.user_tenant_memberships AS membership
       WHERE membership.user_id = hook_user_id
         AND membership.membership_status = 'active';
    ELSE
      SELECT count(*)
        INTO default_membership_count
        FROM vibe_auth.user_tenant_memberships AS membership
       WHERE membership.user_id = hook_user_id
         AND membership.membership_status = 'active'
         AND membership.is_default;

      IF default_membership_count = 1 THEN
        SELECT membership.tenant_id
          INTO resolved_tenant_id
          FROM vibe_auth.user_tenant_memberships AS membership
         WHERE membership.user_id = hook_user_id
           AND membership.membership_status = 'active'
           AND membership.is_default;
      END IF;
    END IF;
  END IF;

  -- No active membership or an invalid selection means no tenant claim is issued.
  -- The Graph API rejects such a token and RLS resolves to no tenant rows.
  IF resolved_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(resolved_tenant_id), true);
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$hook$;

REVOKE EXECUTE ON FUNCTION vibe_auth.custom_access_token_hook(jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION vibe_auth.custom_access_token_hook(jsonb)
  TO supabase_auth_admin;
