CREATE SCHEMA IF NOT EXISTS vibe_meta;
CREATE TABLE IF NOT EXISTS vibe_meta.schema_migrations (version text PRIMARY KEY, checksum text NOT NULL);
CREATE TABLE IF NOT EXISTS vibe_meta.backup_drill_fixture (id integer PRIMARY KEY, tenant_id text NOT NULL, payload text NOT NULL);
TRUNCATE vibe_meta.backup_drill_fixture;
INSERT INTO vibe_meta.schema_migrations(version,checksum) VALUES ('0001','stage17-fixture-checksum') ON CONFLICT(version) DO UPDATE SET checksum=EXCLUDED.checksum;
INSERT INTO vibe_meta.backup_drill_fixture(id,tenant_id,payload) VALUES (1,'tenant-a','recovery-proof');
