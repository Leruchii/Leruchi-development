\set ON_ERROR_STOP on

DO $$
DECLARE
  catalog_version text;
  table_count integer;
  column_count integer;
  vector_count integer;
  policy_count integer;
  graph_count integer;
  first_hash text;
  second_hash text;
BEGIN
  SELECT min(catalog_version) INTO catalog_version
  FROM vibe_meta.schema_catalog_entries;

  IF catalog_version IS DISTINCT FROM 'v1' THEN
    RAISE EXCEPTION 'Expected catalog version v1, got %', catalog_version;
  END IF;

  SELECT count(*) INTO table_count
  FROM vibe_meta.schema_catalog_entries
  WHERE catalog_version = 'v1' AND object_kind = 'table';

  IF table_count < 1 THEN
    RAISE EXCEPTION 'No relational tables catalogued';
  END IF;

  SELECT count(*) INTO column_count
  FROM vibe_meta.schema_catalog_entries
  WHERE catalog_version = 'v1' AND object_kind = 'column';

  IF column_count < 1 THEN
    RAISE EXCEPTION 'No relational columns catalogued';
  END IF;

  SELECT count(*) INTO vector_count
  FROM vibe_meta.schema_catalog_entries
  WHERE catalog_version = 'v1' AND object_kind = 'vector'
    AND parent_name = 'embedding';

  IF vector_count < 1 THEN
    RAISE EXCEPTION 'Vector metadata missing';
  END IF;

  SELECT count(*) INTO policy_count
  FROM vibe_meta.schema_catalog_entries
  WHERE catalog_version = 'v1' AND object_kind = 'policy';

  IF policy_count < 1 THEN
    RAISE EXCEPTION 'RLS policy metadata missing';
  END IF;

  SELECT count(*) INTO graph_count
  FROM vibe_meta.schema_catalog_entries
  WHERE catalog_version = 'v1' AND object_kind = 'graph';

  IF graph_count <> 2 THEN
    RAISE EXCEPTION 'Expected 2 registered graph objects, got %', graph_count;
  END IF;

  SELECT md5(string_agg(
    catalog_version || '|' || object_kind || '|' || schema_name || '|' ||
    object_name || '|' || parent_name || '|' || metadata::text,
    E'\n' ORDER BY catalog_version, object_kind, schema_name, object_name, parent_name
  ))
  INTO first_hash
  FROM vibe_meta.schema_catalog_entries;

  PERFORM vibe_meta.refresh_schema_catalog();

  SELECT md5(string_agg(
    catalog_version || '|' || object_kind || '|' || schema_name || '|' ||
    object_name || '|' || parent_name || '|' || metadata::text,
    E'\n' ORDER BY catalog_version, object_kind, schema_name, object_name, parent_name
  ))
  INTO second_hash
  FROM vibe_meta.schema_catalog_entries;

  IF first_hash IS DISTINCT FROM second_hash THEN
    RAISE EXCEPTION 'Catalog refresh is not deterministic';
  END IF;

  IF (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'Runtime role bypasses security';
  END IF;
END
$$;

SELECT 'stage-04-catalog-ok' AS result;
