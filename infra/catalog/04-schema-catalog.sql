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
  from_label text,
  to_label text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (graph_name, object_kind, object_name, from_label, to_label)
);

CREATE OR REPLACE FUNCTION vibe_meta.refresh_schema_catalog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, information_schema, vibe_meta
AS $$
DECLARE
  catalog_version constant text := 'v1';
BEGIN
  DELETE FROM vibe_meta.schema_catalog_entries
  WHERE catalog_version = refresh_schema_catalog.catalog_version;

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    catalog_version,
    'table',
    t.table_schema,
    t.table_name,
    '',
    jsonb_build_object(
      'table_type', t.table_type
    )
  FROM information_schema.tables t
  WHERE t.table_schema IN ('vibe_app', 'vibe_meta')
    AND t.table_name NOT IN ('schema_catalog_entries', 'graph_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    catalog_version,
    'column',
    c.table_schema,
    c.table_name,
    c.column_name,
    jsonb_build_object(
      'ordinal_position', c.ordinal_position,
      'data_type', c.data_type,
      'udt_schema', c.udt_schema,
      'udt_name', c.udt_name,
      'is_nullable', c.is_nullable,
      'is_identity', c.is_identity,
      'identity_generation', c.identity_generation
    )
  FROM information_schema.columns c
  WHERE c.table_schema IN ('vibe_app', 'vibe_meta')
    AND c.table_name NOT IN ('schema_catalog_entries', 'graph_catalog_registry');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    catalog_version,
    'relationship',
    tc.constraint_schema,
    tc.table_name,
    kcu.column_name,
    jsonb_build_object(
      'constraint_name', tc.constraint_name,
      'foreign_table_schema', ccu.table_schema,
      'foreign_table_name', ccu.table_name,
      'foreign_column_name', ccu.column_name
    )
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_schema = tc.constraint_schema
   AND kcu.constraint_name = tc.constraint_name
   AND kcu.table_name = tc.table_name
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_schema = tc.constraint_schema
   AND ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_schema IN ('vibe_app', 'vibe_meta');

  INSERT INTO vibe_meta.schema_catalog_entries
    (catalog_version, object_kind, schema_name, object_name, parent_name, metadata)
  SELECT
    catalog_version,
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
    catalog_version,
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
    catalog_version,
    'graph',
    'ag_catalog',
    r.graph_name,
    r.object_name,
    jsonb_build_object(
      'graph_object_kind', r.object_kind,
      'from_label', r.from_label,
      'to_label', r.to_label,
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
  ('vibe_stage01', 'label', 'Person', NULL, NULL, '{"name":"text"}'),
  ('vibe_stage01', 'edge', 'KNOWS', 'Person', 'Person', '{}')
ON CONFLICT DO NOTHING;

SELECT vibe_meta.refresh_schema_catalog();
