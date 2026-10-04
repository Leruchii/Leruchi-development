\set ON_ERROR_STOP on

SELECT current_setting('server_version_num')::int >= 170000 AS postgres_17_plus;

SELECT EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'age' AND extversion = '1.7.0'
) AS age_version_is_pinned;

SELECT EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'vector' AND extversion = '0.8.7'
) AS vector_version_is_pinned;

SELECT current_user = 'vibe_runtime' AS runtime_role_is_correct;

SELECT NOT rolsuper AND NOT rolbypassrls AS runtime_is_not_superuser_or_rls_bypass
FROM pg_roles WHERE rolname = current_user;

SELECT COUNT(*) = 3 AS vector_probe_rows_present
FROM vibe_meta.extension_probe;

SELECT id
FROM vibe_meta.extension_probe
ORDER BY embedding <-> '[0.9,0.1,0]'
LIMIT 1;

SELECT count(*) = 0 AS graph_starts_empty
FROM cypher('vibe_stage01', $$
  MATCH (n:Person)
  RETURN n
$$) AS (n agtype);

SELECT * FROM cypher('vibe_stage01', $$
  CREATE (alice:Person {name: 'Alice'})
  CREATE (bob:Person {name: 'Bob'})
  CREATE (alice)-[:KNOWS]->(bob)
  RETURN alice.name, bob.name
$$) AS (alice_name agtype, bob_name agtype);

SELECT count(*) = 1 AS graph_edge_exists
FROM cypher('vibe_stage01', $$
  MATCH (a:Person)-[:KNOWS]->(b:Person)
  RETURN a.name, b.name
$$) AS (a_name agtype, b_name agtype);

SELECT count(*) = 2 AS graph_vertices_exist
FROM cypher('vibe_stage01', $$
  MATCH (n:Person)
  RETURN n.name
$$) AS (name agtype);
