\set ON_ERROR_STOP on
-- Vibe migration contract: forward-only, applied by vibe_migrator.
-- Shared catalog scope is tenant_id = ''. Private scope is the tenant identifier.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

DO $$
BEGIN
  IF current_user <> 'vibe_migrator' THEN
    RAISE EXCEPTION 'Vibe migrations must run as vibe_migrator; current_user=%', current_user;
  END IF;
END $$;

ALTER TABLE vibe_meta.graph_catalog_registry
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT '';

ALTER TABLE vibe_meta.schema_catalog_entries
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT '';

ALTER TABLE vibe_meta.graph_catalog_registry DROP CONSTRAINT IF EXISTS graph_catalog_registry_pkey;
ALTER TABLE vibe_meta.schema_catalog_entries DROP CONSTRAINT IF EXISTS schema_catalog_entries_pkey;

ALTER TABLE vibe_meta.graph_catalog_registry
  ADD CONSTRAINT graph_catalog_registry_pkey
  PRIMARY KEY (tenant_id, graph_name, object_kind, object_name, from_label, to_label);

ALTER TABLE vibe_meta.schema_catalog_entries
  ADD CONSTRAINT schema_catalog_entries_pkey
  PRIMARY KEY (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id);

ALTER TABLE vibe_meta.graph_catalog_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.graph_catalog_registry FORCE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.schema_catalog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.schema_catalog_entries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS graph_catalog_visibility ON vibe_meta.graph_catalog_registry;
CREATE POLICY graph_catalog_visibility
  ON vibe_meta.graph_catalog_registry FOR SELECT
  TO PUBLIC
  USING (
    tenant_id = ''
    OR tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')
  );

DROP POLICY IF EXISTS schema_catalog_visibility ON vibe_meta.schema_catalog_entries;
CREATE POLICY schema_catalog_visibility
  ON vibe_meta.schema_catalog_entries FOR SELECT
  TO vibe_runtime, anon, authenticated
  USING (
    tenant_id = ''
    OR tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')
  );

DROP POLICY IF EXISTS graph_catalog_migrator_maintenance ON vibe_meta.graph_catalog_registry;
CREATE POLICY graph_catalog_migrator_maintenance
  ON vibe_meta.graph_catalog_registry FOR ALL TO vibe_migrator
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS schema_catalog_migrator_maintenance ON vibe_meta.schema_catalog_entries;
CREATE POLICY schema_catalog_migrator_maintenance
  ON vibe_meta.schema_catalog_entries FOR ALL TO vibe_migrator
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS graph_catalog_tenant_graph_idx
  ON vibe_meta.graph_catalog_registry (tenant_id, graph_name);
CREATE INDEX IF NOT EXISTS schema_catalog_tenant_idx
  ON vibe_meta.schema_catalog_entries (tenant_id);

INSERT INTO vibe_meta.schema_migrations (migration_id) VALUES ('0001-catalog-tenant-visibility') ON CONFLICT (migration_id) DO NOTHING;

SELECT 'catalog-tenant-visibility-migration-ok' AS result;
