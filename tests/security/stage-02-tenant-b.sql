\set ON_ERROR_STOP on

DO $$
DECLARE
  visible_rows integer;
  leaked_rows integer;
  updated_rows integer;
  deleted_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM vibe_app.tenant_records;
  IF visible_rows <> 1 THEN RAISE EXCEPTION 'Tenant B relational visibility expected 1, got %', visible_rows; END IF;

  SELECT count(*) INTO visible_rows FROM vibe_app.tenant_records
  WHERE tenant_id = 'vibe_tenant_b' AND secret = 'B-secret';
  IF visible_rows <> 1 THEN RAISE EXCEPTION 'Tenant B cannot read its own row'; END IF;

  SELECT count(*) INTO leaked_rows FROM vibe_app.tenant_records
  WHERE tenant_id = 'vibe_tenant_a';
  IF leaked_rows <> 0 THEN RAISE EXCEPTION 'Tenant B can read tenant A'; END IF;

  UPDATE vibe_app.tenant_records SET secret = 'B-should-not-update-A'
  WHERE tenant_id = 'vibe_tenant_a';
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows <> 0 THEN RAISE EXCEPTION 'Tenant B updated tenant A'; END IF;

  DELETE FROM vibe_app.tenant_records WHERE tenant_id = 'vibe_tenant_a';
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  IF deleted_rows <> 0 THEN RAISE EXCEPTION 'Tenant B deleted tenant A'; END IF;

  SELECT count(*) INTO visible_rows
  FROM ag_catalog.cypher('leruchi_security', $cypher$
    MATCH (n:Account) RETURN n
  $cypher$) AS (n ag_catalog.agtype);
  IF visible_rows <> 2 THEN RAISE EXCEPTION 'Tenant B graph visibility expected 2, got %', visible_rows; END IF;

  SELECT count(*) INTO leaked_rows
  FROM ag_catalog.cypher('leruchi_security', $cypher$
    MATCH (n:Account) WHERE n.name = 'A1' RETURN n
  $cypher$) AS (n ag_catalog.agtype);
  IF leaked_rows <> 0 THEN RAISE EXCEPTION 'Tenant B directly read tenant A graph vertex'; END IF;

  IF (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'Tenant B role bypasses RLS';
  END IF;
END
$$;

SELECT 'tenant-b-security-ok' AS result;
