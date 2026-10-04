\set ON_ERROR_STOP on
-- Vibe migration contract: forward-only, applied by vibe_migrator.
-- Stage 15: tenant-scoped vector catalog metadata.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

DO $$
BEGIN
  IF current_user <> 'vibe_migrator' THEN
    RAISE EXCEPTION 'Vibe migrations must run as vibe_migrator; current_user=%', current_user;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS vibe_meta.vector_catalog_registry (
  tenant_id text NOT NULL DEFAULT '',
  catalog_ref text NOT NULL,
  schema_name text NOT NULL,
  relation_name text NOT NULL,
  embedding_column text NOT NULL,
  key_column text NOT NULL,
  content_column text NOT NULL DEFAULT '',
  dimensions integer NOT NULL CHECK (dimensions > 0 AND dimensions <= 65536),
  model text NOT NULL DEFAULT '',
  distance_metric text NOT NULL CHECK (distance_metric IN ('cosine', 'inner_product', 'l2')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT vector_catalog_catalog_ref_check CHECK (catalog_ref ~ '^[A-Za-z_][A-Za-z0-9_.]*
);

ALTER TABLE vibe_meta.vector_catalog_registry OWNER TO vibe_migrator;
ALTER TABLE vibe_meta.vector_catalog_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.vector_catalog_registry FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vector_catalog_visibility ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_visibility
  ON vibe_meta.vector_catalog_registry FOR SELECT TO PUBLIC
  USING (
    tenant_id = ''
    OR tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')
  );

DROP POLICY IF EXISTS vector_catalog_migrator_maintenance ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_migrator_maintenance
  ON vibe_meta.vector_catalog_registry FOR ALL TO vibe_migrator
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS vector_catalog_tenant_idx
  ON vibe_meta.vector_catalog_registry (tenant_id);

GRANT SELECT ON vibe_meta.vector_catalog_registry TO vibe_runtime;

CREATE OR REPLACE FUNCTION vibe_meta.refresh_schema_catalog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, vibe_meta
AS $$
DECLARE v_catalog_version constant text := 'v1';
BEGIN
  DELETE FROM vibe_meta.schema_catalog_entries WHERE catalog_version = v_catalog_version;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'table', n.nspname, c.relname, '', '',
    jsonb_build_object('table_type', CASE c.relkind WHEN 'p' THEN 'partitioned_table' ELSE 'table' END)
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'column', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('ordinal_position', a.attnum, 'sql_type', format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname, 'is_nullable', NOT a.attnotnull, 'is_identity', a.attidentity <> '',
      'identity_generation', NULLIF(a.attidentity, ''), 'is_generated', a.attgenerated <> '')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'relationship', src_n.nspname, src_c.relname, src_a.attname, '',
    jsonb_build_object('constraint_name', con.conname, 'foreign_table_schema', dst_n.nspname,
      'foreign_table_name', dst_c.relname, 'foreign_column_name', dst_a.attname)
  FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class src_c ON src_c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace src_n ON src_n.oid = src_c.relnamespace JOIN pg_catalog.pg_class dst_c ON dst_c.oid = con.confrelid
  JOIN pg_catalog.pg_namespace dst_n ON dst_n.oid = dst_c.relnamespace
  JOIN LATERAL generate_subscripts(con.conkey, 1) s(i) ON true
  JOIN pg_catalog.pg_attribute src_a ON src_a.attrelid = con.conrelid AND src_a.attnum = con.conkey[s.i]
  JOIN pg_catalog.pg_attribute dst_a ON dst_a.attrelid = con.confrelid AND dst_a.attnum = con.confkey[s.i]
  WHERE con.contype = 'f' AND src_n.nspname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('sql_type', format_type(a.atttypid, a.atttypmod), 'udt_name', t.typname,
      'visibility', 'shared', 'source', 'physical_schema_scan')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'vector';

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'policy', p.schemaname, p.tablename, p.policyname, '',
    jsonb_build_object('permissive', p.permissive, 'roles', p.roles, 'command', p.cmd, 'using', p.qual, 'with_check', p.with_check)
  FROM pg_catalog.pg_policies p WHERE p.schemaname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'graph', 'ag_catalog', r.graph_name, r.object_name, r.tenant_id,
    jsonb_build_object('graph_object_kind', r.object_kind, 'from_label', NULLIF(r.from_label, ''),
      'to_label', NULLIF(r.to_label, ''), 'properties', r.properties, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END)
  FROM vibe_meta.graph_catalog_registry r;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', r.schema_name, r.relation_name, r.embedding_column, r.tenant_id,
    jsonb_build_object('catalog_ref', r.catalog_ref, 'dimensions', r.dimensions, 'key_column', r.key_column, 'content_column', r.content_column, 'model', r.model,
      'distance_metric', r.distance_metric, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END,
      'metadata', r.metadata)
  FROM vibe_meta.vector_catalog_registry r;
END;
$$;

ALTER FUNCTION vibe_meta.refresh_schema_catalog() OWNER TO vibe_migrator;

INSERT INTO vibe_meta.schema_migrations (migration_id)
VALUES ('0003-vector-catalog')
ON CONFLICT (migration_id) DO NOTHING;

SELECT 'vector-catalog-migration-ok' AS result;
),
  CONSTRAINT vector_catalog_schema_check CHECK (schema_name ~ '^[A-Za-z_][A-Za-z0-9_]*
);

ALTER TABLE vibe_meta.vector_catalog_registry OWNER TO vibe_migrator;
ALTER TABLE vibe_meta.vector_catalog_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.vector_catalog_registry FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vector_catalog_visibility ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_visibility
  ON vibe_meta.vector_catalog_registry FOR SELECT TO PUBLIC
  USING (
    tenant_id = ''
    OR tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')
  );

DROP POLICY IF EXISTS vector_catalog_migrator_maintenance ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_migrator_maintenance
  ON vibe_meta.vector_catalog_registry FOR ALL TO vibe_migrator
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS vector_catalog_tenant_idx
  ON vibe_meta.vector_catalog_registry (tenant_id);

GRANT SELECT ON vibe_meta.vector_catalog_registry TO vibe_runtime;

CREATE OR REPLACE FUNCTION vibe_meta.refresh_schema_catalog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, vibe_meta
AS $$
DECLARE v_catalog_version constant text := 'v1';
BEGIN
  DELETE FROM vibe_meta.schema_catalog_entries WHERE catalog_version = v_catalog_version;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'table', n.nspname, c.relname, '', '',
    jsonb_build_object('table_type', CASE c.relkind WHEN 'p' THEN 'partitioned_table' ELSE 'table' END)
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'column', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('ordinal_position', a.attnum, 'sql_type', format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname, 'is_nullable', NOT a.attnotnull, 'is_identity', a.attidentity <> '',
      'identity_generation', NULLIF(a.attidentity, ''), 'is_generated', a.attgenerated <> '')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'relationship', src_n.nspname, src_c.relname, src_a.attname, '',
    jsonb_build_object('constraint_name', con.conname, 'foreign_table_schema', dst_n.nspname,
      'foreign_table_name', dst_c.relname, 'foreign_column_name', dst_a.attname)
  FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class src_c ON src_c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace src_n ON src_n.oid = src_c.relnamespace JOIN pg_catalog.pg_class dst_c ON dst_c.oid = con.confrelid
  JOIN pg_catalog.pg_namespace dst_n ON dst_n.oid = dst_c.relnamespace
  JOIN LATERAL generate_subscripts(con.conkey, 1) s(i) ON true
  JOIN pg_catalog.pg_attribute src_a ON src_a.attrelid = con.conrelid AND src_a.attnum = con.conkey[s.i]
  JOIN pg_catalog.pg_attribute dst_a ON dst_a.attrelid = con.confrelid AND dst_a.attnum = con.confkey[s.i]
  WHERE con.contype = 'f' AND src_n.nspname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('sql_type', format_type(a.atttypid, a.atttypmod), 'udt_name', t.typname,
      'visibility', 'shared', 'source', 'physical_schema_scan')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'vector';

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'policy', p.schemaname, p.tablename, p.policyname, '',
    jsonb_build_object('permissive', p.permissive, 'roles', p.roles, 'command', p.cmd, 'using', p.qual, 'with_check', p.with_check)
  FROM pg_catalog.pg_policies p WHERE p.schemaname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'graph', 'ag_catalog', r.graph_name, r.object_name, r.tenant_id,
    jsonb_build_object('graph_object_kind', r.object_kind, 'from_label', NULLIF(r.from_label, ''),
      'to_label', NULLIF(r.to_label, ''), 'properties', r.properties, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END)
  FROM vibe_meta.graph_catalog_registry r;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', r.schema_name, r.relation_name, r.embedding_column, r.tenant_id,
    jsonb_build_object('catalog_ref', r.catalog_ref, 'dimensions', r.dimensions, 'key_column', r.key_column, 'content_column', r.content_column, 'model', r.model,
      'distance_metric', r.distance_metric, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END,
      'metadata', r.metadata)
  FROM vibe_meta.vector_catalog_registry r;
END;
$$;

ALTER FUNCTION vibe_meta.refresh_schema_catalog() OWNER TO vibe_migrator;

INSERT INTO vibe_meta.schema_migrations (migration_id)
VALUES ('0003-vector-catalog')
ON CONFLICT (migration_id) DO NOTHING;

SELECT 'vector-catalog-migration-ok' AS result;
),
  CONSTRAINT vector_catalog_relation_check CHECK (relation_name ~ '^[A-Za-z_][A-Za-z0-9_]*
);

ALTER TABLE vibe_meta.vector_catalog_registry OWNER TO vibe_migrator;
ALTER TABLE vibe_meta.vector_catalog_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.vector_catalog_registry FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vector_catalog_visibility ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_visibility
  ON vibe_meta.vector_catalog_registry FOR SELECT TO PUBLIC
  USING (
    tenant_id = ''
    OR tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')
  );

DROP POLICY IF EXISTS vector_catalog_migrator_maintenance ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_migrator_maintenance
  ON vibe_meta.vector_catalog_registry FOR ALL TO vibe_migrator
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS vector_catalog_tenant_idx
  ON vibe_meta.vector_catalog_registry (tenant_id);

GRANT SELECT ON vibe_meta.vector_catalog_registry TO vibe_runtime;

CREATE OR REPLACE FUNCTION vibe_meta.refresh_schema_catalog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, vibe_meta
AS $$
DECLARE v_catalog_version constant text := 'v1';
BEGIN
  DELETE FROM vibe_meta.schema_catalog_entries WHERE catalog_version = v_catalog_version;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'table', n.nspname, c.relname, '', '',
    jsonb_build_object('table_type', CASE c.relkind WHEN 'p' THEN 'partitioned_table' ELSE 'table' END)
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'column', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('ordinal_position', a.attnum, 'sql_type', format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname, 'is_nullable', NOT a.attnotnull, 'is_identity', a.attidentity <> '',
      'identity_generation', NULLIF(a.attidentity, ''), 'is_generated', a.attgenerated <> '')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'relationship', src_n.nspname, src_c.relname, src_a.attname, '',
    jsonb_build_object('constraint_name', con.conname, 'foreign_table_schema', dst_n.nspname,
      'foreign_table_name', dst_c.relname, 'foreign_column_name', dst_a.attname)
  FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class src_c ON src_c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace src_n ON src_n.oid = src_c.relnamespace JOIN pg_catalog.pg_class dst_c ON dst_c.oid = con.confrelid
  JOIN pg_catalog.pg_namespace dst_n ON dst_n.oid = dst_c.relnamespace
  JOIN LATERAL generate_subscripts(con.conkey, 1) s(i) ON true
  JOIN pg_catalog.pg_attribute src_a ON src_a.attrelid = con.conrelid AND src_a.attnum = con.conkey[s.i]
  JOIN pg_catalog.pg_attribute dst_a ON dst_a.attrelid = con.confrelid AND dst_a.attnum = con.confkey[s.i]
  WHERE con.contype = 'f' AND src_n.nspname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('sql_type', format_type(a.atttypid, a.atttypmod), 'udt_name', t.typname,
      'visibility', 'shared', 'source', 'physical_schema_scan')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'vector';

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'policy', p.schemaname, p.tablename, p.policyname, '',
    jsonb_build_object('permissive', p.permissive, 'roles', p.roles, 'command', p.cmd, 'using', p.qual, 'with_check', p.with_check)
  FROM pg_catalog.pg_policies p WHERE p.schemaname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'graph', 'ag_catalog', r.graph_name, r.object_name, r.tenant_id,
    jsonb_build_object('graph_object_kind', r.object_kind, 'from_label', NULLIF(r.from_label, ''),
      'to_label', NULLIF(r.to_label, ''), 'properties', r.properties, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END)
  FROM vibe_meta.graph_catalog_registry r;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', r.schema_name, r.relation_name, r.embedding_column, r.tenant_id,
    jsonb_build_object('catalog_ref', r.catalog_ref, 'dimensions', r.dimensions, 'key_column', r.key_column, 'content_column', r.content_column, 'model', r.model,
      'distance_metric', r.distance_metric, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END,
      'metadata', r.metadata)
  FROM vibe_meta.vector_catalog_registry r;
END;
$$;

ALTER FUNCTION vibe_meta.refresh_schema_catalog() OWNER TO vibe_migrator;

INSERT INTO vibe_meta.schema_migrations (migration_id)
VALUES ('0003-vector-catalog')
ON CONFLICT (migration_id) DO NOTHING;

SELECT 'vector-catalog-migration-ok' AS result;
),
  CONSTRAINT vector_catalog_embedding_check CHECK (embedding_column ~ '^[A-Za-z_][A-Za-z0-9_]*
);

ALTER TABLE vibe_meta.vector_catalog_registry OWNER TO vibe_migrator;
ALTER TABLE vibe_meta.vector_catalog_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.vector_catalog_registry FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vector_catalog_visibility ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_visibility
  ON vibe_meta.vector_catalog_registry FOR SELECT TO PUBLIC
  USING (
    tenant_id = ''
    OR tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')
  );

DROP POLICY IF EXISTS vector_catalog_migrator_maintenance ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_migrator_maintenance
  ON vibe_meta.vector_catalog_registry FOR ALL TO vibe_migrator
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS vector_catalog_tenant_idx
  ON vibe_meta.vector_catalog_registry (tenant_id);

GRANT SELECT ON vibe_meta.vector_catalog_registry TO vibe_runtime;

CREATE OR REPLACE FUNCTION vibe_meta.refresh_schema_catalog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, vibe_meta
AS $$
DECLARE v_catalog_version constant text := 'v1';
BEGIN
  DELETE FROM vibe_meta.schema_catalog_entries WHERE catalog_version = v_catalog_version;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'table', n.nspname, c.relname, '', '',
    jsonb_build_object('table_type', CASE c.relkind WHEN 'p' THEN 'partitioned_table' ELSE 'table' END)
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'column', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('ordinal_position', a.attnum, 'sql_type', format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname, 'is_nullable', NOT a.attnotnull, 'is_identity', a.attidentity <> '',
      'identity_generation', NULLIF(a.attidentity, ''), 'is_generated', a.attgenerated <> '')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'relationship', src_n.nspname, src_c.relname, src_a.attname, '',
    jsonb_build_object('constraint_name', con.conname, 'foreign_table_schema', dst_n.nspname,
      'foreign_table_name', dst_c.relname, 'foreign_column_name', dst_a.attname)
  FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class src_c ON src_c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace src_n ON src_n.oid = src_c.relnamespace JOIN pg_catalog.pg_class dst_c ON dst_c.oid = con.confrelid
  JOIN pg_catalog.pg_namespace dst_n ON dst_n.oid = dst_c.relnamespace
  JOIN LATERAL generate_subscripts(con.conkey, 1) s(i) ON true
  JOIN pg_catalog.pg_attribute src_a ON src_a.attrelid = con.conrelid AND src_a.attnum = con.conkey[s.i]
  JOIN pg_catalog.pg_attribute dst_a ON dst_a.attrelid = con.confrelid AND dst_a.attnum = con.confkey[s.i]
  WHERE con.contype = 'f' AND src_n.nspname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('sql_type', format_type(a.atttypid, a.atttypmod), 'udt_name', t.typname,
      'visibility', 'shared', 'source', 'physical_schema_scan')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'vector';

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'policy', p.schemaname, p.tablename, p.policyname, '',
    jsonb_build_object('permissive', p.permissive, 'roles', p.roles, 'command', p.cmd, 'using', p.qual, 'with_check', p.with_check)
  FROM pg_catalog.pg_policies p WHERE p.schemaname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'graph', 'ag_catalog', r.graph_name, r.object_name, r.tenant_id,
    jsonb_build_object('graph_object_kind', r.object_kind, 'from_label', NULLIF(r.from_label, ''),
      'to_label', NULLIF(r.to_label, ''), 'properties', r.properties, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END)
  FROM vibe_meta.graph_catalog_registry r;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', r.schema_name, r.relation_name, r.embedding_column, r.tenant_id,
    jsonb_build_object('catalog_ref', r.catalog_ref, 'dimensions', r.dimensions, 'key_column', r.key_column, 'content_column', r.content_column, 'model', r.model,
      'distance_metric', r.distance_metric, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END,
      'metadata', r.metadata)
  FROM vibe_meta.vector_catalog_registry r;
END;
$$;

ALTER FUNCTION vibe_meta.refresh_schema_catalog() OWNER TO vibe_migrator;

INSERT INTO vibe_meta.schema_migrations (migration_id)
VALUES ('0003-vector-catalog')
ON CONFLICT (migration_id) DO NOTHING;

SELECT 'vector-catalog-migration-ok' AS result;
),
  CONSTRAINT vector_catalog_key_check CHECK (key_column ~ '^[A-Za-z_][A-Za-z0-9_]*
);

ALTER TABLE vibe_meta.vector_catalog_registry OWNER TO vibe_migrator;
ALTER TABLE vibe_meta.vector_catalog_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.vector_catalog_registry FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vector_catalog_visibility ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_visibility
  ON vibe_meta.vector_catalog_registry FOR SELECT TO PUBLIC
  USING (
    tenant_id = ''
    OR tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')
  );

DROP POLICY IF EXISTS vector_catalog_migrator_maintenance ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_migrator_maintenance
  ON vibe_meta.vector_catalog_registry FOR ALL TO vibe_migrator
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS vector_catalog_tenant_idx
  ON vibe_meta.vector_catalog_registry (tenant_id);

GRANT SELECT ON vibe_meta.vector_catalog_registry TO vibe_runtime;

CREATE OR REPLACE FUNCTION vibe_meta.refresh_schema_catalog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, vibe_meta
AS $$
DECLARE v_catalog_version constant text := 'v1';
BEGIN
  DELETE FROM vibe_meta.schema_catalog_entries WHERE catalog_version = v_catalog_version;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'table', n.nspname, c.relname, '', '',
    jsonb_build_object('table_type', CASE c.relkind WHEN 'p' THEN 'partitioned_table' ELSE 'table' END)
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'column', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('ordinal_position', a.attnum, 'sql_type', format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname, 'is_nullable', NOT a.attnotnull, 'is_identity', a.attidentity <> '',
      'identity_generation', NULLIF(a.attidentity, ''), 'is_generated', a.attgenerated <> '')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'relationship', src_n.nspname, src_c.relname, src_a.attname, '',
    jsonb_build_object('constraint_name', con.conname, 'foreign_table_schema', dst_n.nspname,
      'foreign_table_name', dst_c.relname, 'foreign_column_name', dst_a.attname)
  FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class src_c ON src_c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace src_n ON src_n.oid = src_c.relnamespace JOIN pg_catalog.pg_class dst_c ON dst_c.oid = con.confrelid
  JOIN pg_catalog.pg_namespace dst_n ON dst_n.oid = dst_c.relnamespace
  JOIN LATERAL generate_subscripts(con.conkey, 1) s(i) ON true
  JOIN pg_catalog.pg_attribute src_a ON src_a.attrelid = con.conrelid AND src_a.attnum = con.conkey[s.i]
  JOIN pg_catalog.pg_attribute dst_a ON dst_a.attrelid = con.confrelid AND dst_a.attnum = con.confkey[s.i]
  WHERE con.contype = 'f' AND src_n.nspname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('sql_type', format_type(a.atttypid, a.atttypmod), 'udt_name', t.typname,
      'visibility', 'shared', 'source', 'physical_schema_scan')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'vector';

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'policy', p.schemaname, p.tablename, p.policyname, '',
    jsonb_build_object('permissive', p.permissive, 'roles', p.roles, 'command', p.cmd, 'using', p.qual, 'with_check', p.with_check)
  FROM pg_catalog.pg_policies p WHERE p.schemaname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'graph', 'ag_catalog', r.graph_name, r.object_name, r.tenant_id,
    jsonb_build_object('graph_object_kind', r.object_kind, 'from_label', NULLIF(r.from_label, ''),
      'to_label', NULLIF(r.to_label, ''), 'properties', r.properties, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END)
  FROM vibe_meta.graph_catalog_registry r;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', r.schema_name, r.relation_name, r.embedding_column, r.tenant_id,
    jsonb_build_object('catalog_ref', r.catalog_ref, 'dimensions', r.dimensions, 'key_column', r.key_column, 'content_column', r.content_column, 'model', r.model,
      'distance_metric', r.distance_metric, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END,
      'metadata', r.metadata)
  FROM vibe_meta.vector_catalog_registry r;
END;
$$;

ALTER FUNCTION vibe_meta.refresh_schema_catalog() OWNER TO vibe_migrator;

INSERT INTO vibe_meta.schema_migrations (migration_id)
VALUES ('0003-vector-catalog')
ON CONFLICT (migration_id) DO NOTHING;

SELECT 'vector-catalog-migration-ok' AS result;
),
  CONSTRAINT vector_catalog_content_check CHECK (content_column = '' OR content_column ~ '^[A-Za-z_][A-Za-z0-9_]*
);

ALTER TABLE vibe_meta.vector_catalog_registry OWNER TO vibe_migrator;
ALTER TABLE vibe_meta.vector_catalog_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.vector_catalog_registry FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vector_catalog_visibility ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_visibility
  ON vibe_meta.vector_catalog_registry FOR SELECT TO PUBLIC
  USING (
    tenant_id = ''
    OR tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')
  );

DROP POLICY IF EXISTS vector_catalog_migrator_maintenance ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_migrator_maintenance
  ON vibe_meta.vector_catalog_registry FOR ALL TO vibe_migrator
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS vector_catalog_tenant_idx
  ON vibe_meta.vector_catalog_registry (tenant_id);

GRANT SELECT ON vibe_meta.vector_catalog_registry TO vibe_runtime;

CREATE OR REPLACE FUNCTION vibe_meta.refresh_schema_catalog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, vibe_meta
AS $$
DECLARE v_catalog_version constant text := 'v1';
BEGIN
  DELETE FROM vibe_meta.schema_catalog_entries WHERE catalog_version = v_catalog_version;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'table', n.nspname, c.relname, '', '',
    jsonb_build_object('table_type', CASE c.relkind WHEN 'p' THEN 'partitioned_table' ELSE 'table' END)
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'column', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('ordinal_position', a.attnum, 'sql_type', format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname, 'is_nullable', NOT a.attnotnull, 'is_identity', a.attidentity <> '',
      'identity_generation', NULLIF(a.attidentity, ''), 'is_generated', a.attgenerated <> '')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'relationship', src_n.nspname, src_c.relname, src_a.attname, '',
    jsonb_build_object('constraint_name', con.conname, 'foreign_table_schema', dst_n.nspname,
      'foreign_table_name', dst_c.relname, 'foreign_column_name', dst_a.attname)
  FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class src_c ON src_c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace src_n ON src_n.oid = src_c.relnamespace JOIN pg_catalog.pg_class dst_c ON dst_c.oid = con.confrelid
  JOIN pg_catalog.pg_namespace dst_n ON dst_n.oid = dst_c.relnamespace
  JOIN LATERAL generate_subscripts(con.conkey, 1) s(i) ON true
  JOIN pg_catalog.pg_attribute src_a ON src_a.attrelid = con.conrelid AND src_a.attnum = con.conkey[s.i]
  JOIN pg_catalog.pg_attribute dst_a ON dst_a.attrelid = con.confrelid AND dst_a.attnum = con.confkey[s.i]
  WHERE con.contype = 'f' AND src_n.nspname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('sql_type', format_type(a.atttypid, a.atttypmod), 'udt_name', t.typname,
      'visibility', 'shared', 'source', 'physical_schema_scan')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'vector';

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'policy', p.schemaname, p.tablename, p.policyname, '',
    jsonb_build_object('permissive', p.permissive, 'roles', p.roles, 'command', p.cmd, 'using', p.qual, 'with_check', p.with_check)
  FROM pg_catalog.pg_policies p WHERE p.schemaname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'graph', 'ag_catalog', r.graph_name, r.object_name, r.tenant_id,
    jsonb_build_object('graph_object_kind', r.object_kind, 'from_label', NULLIF(r.from_label, ''),
      'to_label', NULLIF(r.to_label, ''), 'properties', r.properties, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END)
  FROM vibe_meta.graph_catalog_registry r;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', r.schema_name, r.relation_name, r.embedding_column, r.tenant_id,
    jsonb_build_object('catalog_ref', r.catalog_ref, 'dimensions', r.dimensions, 'key_column', r.key_column, 'content_column', r.content_column, 'model', r.model,
      'distance_metric', r.distance_metric, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END,
      'metadata', r.metadata)
  FROM vibe_meta.vector_catalog_registry r;
END;
$$;

ALTER FUNCTION vibe_meta.refresh_schema_catalog() OWNER TO vibe_migrator;

INSERT INTO vibe_meta.schema_migrations (migration_id)
VALUES ('0003-vector-catalog')
ON CONFLICT (migration_id) DO NOTHING;

SELECT 'vector-catalog-migration-ok' AS result;
),
  PRIMARY KEY (tenant_id, catalog_ref)
);

ALTER TABLE vibe_meta.vector_catalog_registry OWNER TO vibe_migrator;
ALTER TABLE vibe_meta.vector_catalog_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.vector_catalog_registry FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vector_catalog_visibility ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_visibility
  ON vibe_meta.vector_catalog_registry FOR SELECT TO PUBLIC
  USING (
    tenant_id = ''
    OR tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id', '')
  );

DROP POLICY IF EXISTS vector_catalog_migrator_maintenance ON vibe_meta.vector_catalog_registry;
CREATE POLICY vector_catalog_migrator_maintenance
  ON vibe_meta.vector_catalog_registry FOR ALL TO vibe_migrator
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS vector_catalog_tenant_idx
  ON vibe_meta.vector_catalog_registry (tenant_id);

GRANT SELECT ON vibe_meta.vector_catalog_registry TO vibe_runtime;

CREATE OR REPLACE FUNCTION vibe_meta.refresh_schema_catalog()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, information_schema, vibe_meta
AS $$
DECLARE v_catalog_version constant text := 'v1';
BEGIN
  DELETE FROM vibe_meta.schema_catalog_entries WHERE catalog_version = v_catalog_version;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'table', n.nspname, c.relname, '', '',
    jsonb_build_object('table_type', CASE c.relkind WHEN 'p' THEN 'partitioned_table' ELSE 'table' END)
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'column', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('ordinal_position', a.attnum, 'sql_type', format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname, 'is_nullable', NOT a.attnotnull, 'is_identity', a.attidentity <> '',
      'identity_generation', NULLIF(a.attidentity, ''), 'is_generated', a.attgenerated <> '')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry', 'vector_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'relationship', src_n.nspname, src_c.relname, src_a.attname, '',
    jsonb_build_object('constraint_name', con.conname, 'foreign_table_schema', dst_n.nspname,
      'foreign_table_name', dst_c.relname, 'foreign_column_name', dst_a.attname)
  FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_class src_c ON src_c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace src_n ON src_n.oid = src_c.relnamespace JOIN pg_catalog.pg_class dst_c ON dst_c.oid = con.confrelid
  JOIN pg_catalog.pg_namespace dst_n ON dst_n.oid = dst_c.relnamespace
  JOIN LATERAL generate_subscripts(con.conkey, 1) s(i) ON true
  JOIN pg_catalog.pg_attribute src_a ON src_a.attrelid = con.conrelid AND src_a.attnum = con.conkey[s.i]
  JOIN pg_catalog.pg_attribute dst_a ON dst_a.attrelid = con.confrelid AND dst_a.attnum = con.confkey[s.i]
  WHERE con.contype = 'f' AND src_n.nspname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', n.nspname, c.relname, a.attname, '',
    jsonb_build_object('sql_type', format_type(a.atttypid, a.atttypmod), 'udt_name', t.typname,
      'visibility', 'shared', 'source', 'physical_schema_scan')
  FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta') AND c.relkind IN ('r', 'p')
    AND a.attnum > 0 AND NOT a.attisdropped AND t.typname = 'vector';

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'policy', p.schemaname, p.tablename, p.policyname, '',
    jsonb_build_object('permissive', p.permissive, 'roles', p.roles, 'command', p.cmd, 'using', p.qual, 'with_check', p.with_check)
  FROM pg_catalog.pg_policies p WHERE p.schemaname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'graph', 'ag_catalog', r.graph_name, r.object_name, r.tenant_id,
    jsonb_build_object('graph_object_kind', r.object_kind, 'from_label', NULLIF(r.from_label, ''),
      'to_label', NULLIF(r.to_label, ''), 'properties', r.properties, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END)
  FROM vibe_meta.graph_catalog_registry r;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, tenant_id, metadata)
  SELECT v_catalog_version, 'vector', r.schema_name, r.relation_name, r.embedding_column, r.tenant_id,
    jsonb_build_object('catalog_ref', r.catalog_ref, 'dimensions', r.dimensions, 'key_column', r.key_column, 'content_column', r.content_column, 'model', r.model,
      'distance_metric', r.distance_metric, 'source', 'explicit_registry',
      'visibility', CASE WHEN r.tenant_id = '' THEN 'shared' ELSE 'tenant' END,
      'metadata', r.metadata)
  FROM vibe_meta.vector_catalog_registry r;
END;
$$;

ALTER FUNCTION vibe_meta.refresh_schema_catalog() OWNER TO vibe_migrator;

INSERT INTO vibe_meta.schema_migrations (migration_id)
VALUES ('0003-vector-catalog')
ON CONFLICT (migration_id) DO NOTHING;

SELECT 'vector-catalog-migration-ok' AS result;
