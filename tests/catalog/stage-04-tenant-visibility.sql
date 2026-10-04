\set ON_ERROR_STOP on
-- Executed as a non-owner role so catalog RLS is actually exercised.

DO $$
DECLARE
  shared_count integer;
  tenant_a_count integer;
  tenant_b_count integer;
BEGIN
  SELECT count(*) INTO shared_count
  FROM vibe_meta.schema_catalog_entries
  WHERE object_kind = 'graph' AND tenant_id = '';

  IF shared_count < 2 THEN
    RAISE EXCEPTION 'Shared graph catalog metadata missing';
  END IF;

  PERFORM set_config('request.jwt.claims', '{"tenant_id":"tenant_a"}', false);

  SELECT count(*) INTO tenant_a_count
  FROM vibe_meta.schema_catalog_entries
  WHERE object_kind = 'graph' AND tenant_id = 'tenant_a';

  IF tenant_a_count <> 1 THEN
    RAISE EXCEPTION 'Tenant A should see exactly one private graph object, got %', tenant_a_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM vibe_meta.schema_catalog_entries
    WHERE object_kind = 'graph' AND tenant_id = 'tenant_b'
  ) THEN
    RAISE EXCEPTION 'Tenant A can see tenant B graph metadata';
  END IF;

  PERFORM set_config('request.jwt.claims', '{"tenant_id":"tenant_b"}', false);

  SELECT count(*) INTO tenant_b_count
  FROM vibe_meta.schema_catalog_entries
  WHERE object_kind = 'graph' AND tenant_id = 'tenant_b';

  IF tenant_b_count <> 1 THEN
    RAISE EXCEPTION 'Tenant B should see exactly one private graph object, got %', tenant_b_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM vibe_meta.schema_catalog_entries
    WHERE object_kind = 'graph' AND tenant_id = 'tenant_a'
  ) THEN
    RAISE EXCEPTION 'Tenant B can see tenant A graph metadata';
  END IF;
END $$;

SELECT 'stage-04-tenant-catalog-visibility-ok' AS result;
