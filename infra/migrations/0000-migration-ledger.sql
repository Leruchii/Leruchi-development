\set ON_ERROR_STOP on
SET lock_timeout = '5s';
SET statement_timeout = '30s';

DO $$
BEGIN
  IF current_user <> 'vibe_migrator' THEN
    RAISE EXCEPTION 'Vibe migrations must run as vibe_migrator; current_user=%', current_user;
  END IF;
END $$;

DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'vibe_meta') THEN
    RAISE EXCEPTION 'vibe_meta schema must be provisioned before migrations';
  END IF;
END $;

CREATE TABLE IF NOT EXISTS vibe_meta.schema_migrations (
  migration_id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vibe_meta.schema_migrations OWNER TO vibe_migrator;
REVOKE ALL ON vibe_meta.schema_migrations FROM PUBLIC;
GRANT SELECT ON vibe_meta.schema_migrations TO vibe_migrator;

INSERT INTO vibe_meta.schema_migrations (migration_id)
VALUES ('0000-migration-ledger')
ON CONFLICT (migration_id) DO NOTHING;
