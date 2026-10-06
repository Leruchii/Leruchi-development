CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'vibe_compat_authenticator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'vibe_compat_auth';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'vibe_compat_storage';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD 'vibe_compat_admin';
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;
CREATE SCHEMA IF NOT EXISTS _realtime AUTHORIZATION supabase_admin;

ALTER ROLE supabase_auth_admin SET search_path = auth, public;
ALTER ROLE supabase_storage_admin SET search_path = storage, public;
ALTER ROLE supabase_admin SET search_path = _realtime, public;

GRANT CONNECT ON DATABASE leruchi TO anon, authenticated, service_role, authenticator, supabase_auth_admin, supabase_storage_admin, supabase_admin;
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
GRANT USAGE ON SCHEMA storage TO supabase_storage_admin;
GRANT USAGE ON SCHEMA _realtime TO supabase_admin;
GRANT anon, authenticated, service_role TO authenticator;

CREATE TABLE IF NOT EXISTS vibe_app.supabase_rls_probe (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  payload text NOT NULL
);

INSERT INTO vibe_app.supabase_rls_probe (tenant_id, payload)
VALUES ('tenant_a', 'A-visible'), ('tenant_b', 'B-hidden')
ON CONFLICT DO NOTHING;

ALTER TABLE vibe_app.supabase_rls_probe ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_app.supabase_rls_probe FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS supabase_jwt_tenant_isolation ON vibe_app.supabase_rls_probe;
CREATE POLICY supabase_jwt_tenant_isolation
  ON vibe_app.supabase_rls_probe
  FOR SELECT
  TO anon, authenticated
  USING (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json ->> 'tenant_id',
      ''
    )
  );

GRANT USAGE ON SCHEMA vibe_app TO anon, authenticated;
GRANT SELECT ON vibe_app.supabase_rls_probe TO anon, authenticated;
