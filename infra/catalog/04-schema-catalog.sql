CREATE SCHEMA IF NOT EXISTS vibe_meta AUTHORIZATION vibe_migrator;

CREATE TABLE IF NOT EXISTS vibe_meta.schema_catalog_entries (
  catalog_version text NOT NULL,
  object_kind text NOT NULL,
  schema_name text NOT NULL,
  object_name text NOT NULL,
  parent_name text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL,
  PRIMARY KEY (catalog_version, object_kind, schema_name, object_name, parent_name)
);

CREATE TABLE IF NOT EXISTS vibe_meta.graph_catalog_registry (
  graph_name text NOT NULL,
  object_kind text NOT NULL CHECK (object_kind IN ('label', 'edge')),
  object_name text NOT NULL,
  from_label text NOT NULL DEFAULT '',
  to_label text NOT NULL DEFAULT '',
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (graph_name, object_kind, object_name, from_label, to_label)
);

ALTER TABLE vibe_meta.schema_catalog_entries OWNER TO vibe_migrator;
ALTER TABLE vibe_meta.graph_catalog_registry OWNER TO vibe_migrator;

CREATE OR REPLACE FUNCTION vibe_meta.refresh_schema_catalog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, information_schema, vibe_meta
AS $$
DECLARE
  v_catalog_version constant text := 'v1';
BEGIN
  DELETE FROM vibe_meta.schema_catalog_entries e
  WHERE e.catalog_version = v_catalog_version;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    v_catalog_version,
    'table',
    n.nspname,
    c.relname,
    '',
    jsonb_build_object(
      'table_type', CASE c.relkind
        WHEN 'p' THEN 'partitioned_table'
        ELSE 'table'
      END
    )
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('vibe_app', 'vibe_meta')
    AND c.relkind IN ('r', 'p')
    AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    v_catalog_version,
    'column',
    n.nspname,
    c.relname,
    a.attname,
    jsonb_build_object(
      'ordinal_position', a.attnum,
      'sql_type', format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname,
      'is_nullable', NOT a.attnotnull,
      'is_identity', a.attidentity <> '',
      'identity_generation', NULLIF(a.attidentity, ''),
      'is_generated', a.attgenerated <> ''
    )
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta')
    AND c.relkind IN ('r', 'p')
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND c.relname NOT IN ('schema_catalog_entries', 'graph_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    v_catalog_version,
    'relationship',
    src_n.nspname,
    src_c.relname,
    src_a.attname,
    jsonb_build_object(
      'constraint_name', con.conname,
      'foreign_table_schema', dst_n.nspname,
      'foreign_table_name', dst_c.relname,
      'foreign_column_name', dst_a.attname
    )
  FROM pg_catalog.pg_constraint con
  JOIN pg_catalog.pg_class src_c ON src_c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace src_n ON src_n.oid = src_c.relnamespace
  JOIN pg_catalog.pg_class dst_c ON dst_c.oid = con.confrelid
  JOIN pg_catalog.pg_namespace dst_n ON dst_n.oid = dst_c.relnamespace
  JOIN LATERAL generate_subscripts(con.conkey, 1) s(i) ON true
  JOIN pg_catalog.pg_attribute src_a
    ON src_a.attrelid = con.conrelid
   AND src_a.attnum = con.conkey[s.i]
  JOIN pg_catalog.pg_attribute dst_a
    ON dst_a.attrelid = con.confrelid
   AND dst_a.attnum = con.confkey[s.i]
  WHERE con.contype = 'f'
    AND src_n.nspname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    v_catalog_version,
    'vector',
    n.nspname,
    c.relname,
    a.attname,
    jsonb_build_object(
      'sql_type', format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname
    )
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
  WHERE n.nspname IN ('vibe_app', 'vibe_meta')
    AND c.relkind IN ('r', 'p')
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND t.typname = 'vector';

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    v_catalog_version,
    'policy',
    p.schemaname,
    p.tablename,
    p.policyname,
    jsonb_build_object(
      'permissive', p.permissive,
      'roles', p.roles,
      'command', p.cmd,
      'using', p.qual,
      'with_check', p.with_check
    )
  FROM pg_catalog.pg_policies p
  WHERE p.schemaname IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    v_catalog_version,
    'graph',
    'ag_catalog',
    r.graph_name,
    r.object_name,
    jsonb_build_object(
      'graph_object_kind', r.object_kind,
      'from_label', NULLIF(r.from_label, ''),
      'to_label', NULLIF(r.to_label, ''),
      'properties', r.properties,
      'source', 'explicit_registry'
    )
  FROM vibe_meta.graph_catalog_registry r;
END;
$$;

ALTER FUNCTION vibe_meta.refresh_schema_catalog() OWNER TO vibe_migrator;

GRANT SELECT ON vibe_meta.schema_catalog_entries TO vibe_runtime;
GRANT SELECT ON vibe_meta.graph_catalog_registry TO vibe_runtime;
GRANT EXECUTE ON FUNCTION vibe_meta.refresh_schema_catalog() TO vibe_migrator;

INSERT INTO vibe_meta.graph_catalog_registry
  (graph_name, object_kind, object_name, from_label, to_label, properties)
VALUES
  ('vibe_stage01', 'label', 'Person', '', '', '{"name":"text"}'),
  ('vibe_stage01', 'edge', 'KNOWS', 'Person', 'Person', '{}')
ON CONFLICT DO NOTHING;

SELECT vibe_meta.refresh_schema_catalog();
