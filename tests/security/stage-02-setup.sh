#!/usr/bin/env bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 -U postgres -d vibedb <<'SQL'
CREATE ROLE vibe_tenant_a
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

CREATE ROLE vibe_tenant_b
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

ALTER ROLE vibe_tenant_a PASSWORD 'tenant-a-ci';
ALTER ROLE vibe_tenant_b PASSWORD 'tenant-b-ci';

ALTER ROLE vibe_tenant_a SET search_path = "$user", public, ag_catalog;
ALTER ROLE vibe_tenant_b SET search_path = "$user", public, ag_catalog;

GRANT CONNECT ON DATABASE vibedb TO vibe_tenant_a, vibe_tenant_b;
GRANT USAGE ON SCHEMA vibe_app, vibe_meta, ag_catalog TO vibe_tenant_a, vibe_tenant_b;
GRANT EXECUTE ON FUNCTION ag_catalog.cypher(name, cstring, ag_catalog.agtype) TO vibe_tenant_a, vibe_tenant_b;

CREATE TABLE vibe_app.tenant_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  secret text NOT NULL
);

INSERT INTO vibe_app.tenant_records (tenant_id, secret)
VALUES
  ('vibe_tenant_a', 'A-secret'),
  ('vibe_tenant_b', 'B-secret');

ALTER TABLE vibe_app.tenant_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_app.tenant_records FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_records_isolation
  ON vibe_app.tenant_records FOR ALL
  TO vibe_tenant_a, vibe_tenant_b
  USING (tenant_id = current_user)
  WITH CHECK (tenant_id = current_user);

GRANT SELECT, INSERT, UPDATE, DELETE ON vibe_app.tenant_records TO vibe_tenant_a, vibe_tenant_b;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA vibe_app TO vibe_tenant_a, vibe_tenant_b;

SET search_path = ag_catalog, "$user", public;

SELECT ag_catalog.create_graph('vibe_security');
SELECT ag_catalog.create_vlabel('vibe_security', 'Account');
SELECT ag_catalog.create_elabel('vibe_security', 'KNOWS');

GRANT USAGE ON SCHEMA vibe_security TO vibe_tenant_a, vibe_tenant_b;

SELECT * FROM ag_catalog.cypher('vibe_security', $cypher$
  CREATE
    (a1:Account {name:'A1', tenant_id:'vibe_tenant_a'}),
    (a2:Account {name:'A2', tenant_id:'vibe_tenant_a'}),
    (b1:Account {name:'B1', tenant_id:'vibe_tenant_b'}),
    (b2:Account {name:'B2', tenant_id:'vibe_tenant_b'}),
    (a1)-[:KNOWS {tenant_id:'vibe_tenant_a'}]->(a2),
    (a1)-[:KNOWS {tenant_id:'vibe_tenant_a'}]->(b1),
    (b1)-[:KNOWS {tenant_id:'vibe_tenant_b'}]->(b2)
  RETURN a1
$cypher$) AS (a1 ag_catalog.agtype);

ALTER TABLE vibe_security."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_security."Account" FORCE ROW LEVEL SECURITY;
ALTER TABLE vibe_security."KNOWS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_security."KNOWS" FORCE ROW LEVEL SECURITY;

CREATE POLICY account_tenant_isolation
  ON vibe_security."Account" FOR ALL
  TO vibe_tenant_a, vibe_tenant_b
  USING (
    ag_catalog.agtype_access_operator(
      VARIADIC ARRAY[properties, '"tenant_id"'::ag_catalog.agtype]
    ) = format('"%s"', current_user)::ag_catalog.agtype
  )
  WITH CHECK (
    ag_catalog.agtype_access_operator(
      VARIADIC ARRAY[properties, '"tenant_id"'::ag_catalog.agtype]
    ) = format('"%s"', current_user)::ag_catalog.agtype
  );

CREATE POLICY knows_tenant_isolation
  ON vibe_security."KNOWS" FOR ALL
  TO vibe_tenant_a, vibe_tenant_b
  USING (
    ag_catalog.agtype_access_operator(
      VARIADIC ARRAY[properties, '"tenant_id"'::ag_catalog.agtype]
    ) = format('"%s"', current_user)::ag_catalog.agtype
  )
  WITH CHECK (
    ag_catalog.agtype_access_operator(
      VARIADIC ARRAY[properties, '"tenant_id"'::ag_catalog.agtype]
    ) = format('"%s"', current_user)::ag_catalog.agtype
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON vibe_security."Account", vibe_security."KNOWS" TO vibe_tenant_a, vibe_tenant_b;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA vibe_security TO vibe_tenant_a, vibe_tenant_b;
SQL
