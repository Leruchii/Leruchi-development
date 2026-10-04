\set ON_ERROR_STOP on

DO $$
DECLARE
  catalog_version text;
  table_count integer;
  column_count integer;
  vector_count integer;
  policy_count integer;
  graph_count integer;
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

  IF (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'Runtime role bypasses security';
  END IF;
END
$$;

SELECT 'stage-04-catalog-runtime-ok' AS result;
