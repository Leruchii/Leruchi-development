\set ON_ERROR_STOP on

DO $$
DECLARE
  visible_rows integer;
  updated_rows integer;
  deleted_rows integer;
  graph_rows integer;
  leaked_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM vibe_app.tenant_records;
  IF visible_rows <> 1 THEN RAISE EXCEPTION 'Tenant A relational visibility expected 1, got %', visible_rows; END IF;

  SELECT count(*) INTO visible_rows FROM vibe_app.tenant_records
  WHERE tenant_id = 'vibe_tenant_a' AND secret = 'A-secret';
  IF visible_rows <> 1 THEN RAISE EXCEPTION 'Tenant A cannot read its own row'; END IF;

  SELECT count(*) INTO visible_rows FROM vibe_app.tenant_records
  WHERE tenant_id = 'vibe_tenant_b';
  IF visible_rows <> 0 THEN RAISE EXCEPTION 'Tenant A can read tenant B'; END IF;

  UPDATE vibe_app.tenant_records SET secret = 'A-should-not-update-B'
  WHERE tenant_id = 'vibe_tenant_b';
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows <> 0 THEN RAISE EXCEPTION 'Tenant A updated tenant B'; END IF;

  DELETE FROM vibe_app.tenant_records WHERE tenant_id = 'vibe_tenant_b';
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  IF deleted_rows <> 0 THEN RAISE EXCEPTION 'Tenant A deleted tenant B'; END IF;

  SELECT count(*) INTO graph_rows
  FROM ag_catalog.cypher('vibe_security', $cypher$
    MATCH (n:Account) RETURN n
  $cypher$) AS (n ag_catalog.agtype);
  IF graph_rows <> 2 THEN RAISE EXCEPTION 'Tenant A graph visibility expected 2, got %', graph_rows; END IF;

  SELECT count(*) INTO leaked_rows
  FROM ag_catalog.cypher('vibe_security', $cypher$
    MATCH (n:Account) WHERE n.name = 'B1' RETURN n
  $cypher$) AS (n ag_catalog.agtype);
  IF leaked_rows <> 0 THEN RAISE EXCEPTION 'Tenant A directly read tenant B graph vertex'; END IF;

  SELECT count(*) INTO leaked_rows
  FROM ag_catalog.cypher('vibe_security', $cypher$
    MATCH (a:Account)-[:KNOWS]->(b:Account)
    WHERE a.name = 'A1' AND b.name = 'B1' RETURN b
  $cypher$) AS (n ag_catalog.agtype);
  IF leaked_rows <> 0 THEN RAISE EXCEPTION 'Tenant A inferred tenant B through a graph edge'; END IF;

  SELECT count(*) INTO graph_rows
  FROM ag_catalog.cypher('vibe_security', $cypher$
    MATCH (a:Account)-[:KNOWS]->(b:Account)
    WHERE a.name = 'A1' AND b.name = 'A2' RETURN b
  $cypher$) AS (n ag_catalog.agtype);
  IF graph_rows <> 1 THEN RAISE EXCEPTION 'Tenant A cannot traverse its own graph relationship'; END IF;

  IF (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'Tenant A role bypasses RLS';
  END IF;
END
$$;

SELECT 'tenant-a-security-ok' AS result;
