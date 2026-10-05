CREATE SCHEMA IF NOT EXISTS vibe_meta;
CREATE TABLE IF NOT EXISTS vibe_meta.schema_migrations (
  migration_id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now(),
  checksum text
);
ALTER TABLE vibe_meta.schema_migrations ADD COLUMN IF NOT EXISTS checksum text;
CREATE TABLE IF NOT EXISTS vibe_meta.backup_drill_fixture (id integer PRIMARY KEY, tenant_id text NOT NULL, payload text NOT NULL);
TRUNCATE vibe_meta.backup_drill_fixture;
INSERT INTO vibe_meta.schema_migrations(migration_id,checksum)
VALUES ('0000-migration-ledger','stage17-fixture-checksum')
ON CONFLICT(migration_id) DO UPDATE SET checksum=EXCLUDED.checksum;
INSERT INTO vibe_meta.backup_drill_fixture(id,tenant_id,payload) VALUES (1,'tenant-a','recovery-proof');
