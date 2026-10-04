\set ON_ERROR_STOP on

DO $$
DECLARE
  pg_version integer;
  age_version text;
  vector_version text;
  runtime_super boolean;
  runtime_bypass boolean;
  vector_rows integer;
  nearest_id bigint;
  graph_edges integer;
  graph_vertices integer;
BEGIN
  SELECT current_setting('server_version_num')::integer INTO pg_version;
  IF pg_version < 170000 THEN
    RAISE EXCEPTION 'PostgreSQL 17+ required, got %', pg_version;
  END IF;

  SELECT extversion INTO age_version FROM pg_extension WHERE extname = 'age';
  IF age_version IS DISTINCT FROM '1.7.0' THEN
    RAISE EXCEPTION 'AGE 1.7.0 required, got %', age_version;
  END IF;

  SELECT extversion INTO vector_version FROM pg_extension WHERE extname = 'vector';
  IF vector_version IS DISTINCT FROM '0.8.7' THEN
    RAISE EXCEPTION 'pgvector 0.8.7 required, got %', vector_version;
  END IF;

  SELECT rolsuper, rolbypassrls
  INTO runtime_super, runtime_bypass
  FROM pg_roles
  WHERE rolname = current_user;

  IF current_user <> 'vibe_runtime' OR runtime_super OR runtime_bypass THEN
    RAISE EXCEPTION 'Runtime role is not correctly restricted';
  END IF;

  SELECT count(*) INTO vector_rows FROM vibe_meta.extension_probe;
  IF vector_rows <> 3 THEN
    RAISE EXCEPTION 'Expected 3 vector probe rows, got %', vector_rows;
  END IF;

  SELECT id INTO nearest_id
  FROM vibe_meta.extension_probe
  ORDER BY embedding <-> '[0.9,0.1,0]'
  LIMIT 1;

  IF nearest_id IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Vector nearest-neighbour query returned unexpected id %', nearest_id;
  END IF;

  SELECT count(*) INTO graph_vertices
  FROM cypher('vibe_stage01', $cypher$
    MATCH (n:Person)
    RETURN n
  $cypher$) AS (n agtype);

  IF graph_vertices <> 0 THEN
    RAISE EXCEPTION 'Graph was not empty before runtime mutation';
  END IF;

  PERFORM *
  FROM cypher('vibe_stage01', $cypher$
    CREATE (alice:Person {name: 'Alice'})
    CREATE (bob:Person {name: 'Bob'})
    CREATE (alice)-[:KNOWS]->(bob)
    RETURN alice.name, bob.name
  $cypher$) AS (alice_name agtype, bob_name agtype);

  SELECT count(*) INTO graph_edges
  FROM cypher('vibe_stage01', $cypher$
    MATCH (a:Person)-[:KNOWS]->(b:Person)
    RETURN a.name, b.name
  $cypher$) AS (a_name agtype, b_name agtype);

  IF graph_edges <> 1 THEN
    RAISE EXCEPTION 'Expected 1 graph edge, got %', graph_edges;
  END IF;

  SELECT count(*) INTO graph_vertices
  FROM cypher('vibe_stage01', $cypher$
    MATCH (n:Person)
    RETURN n.name
  $cypher$) AS (name agtype);

  IF graph_vertices <> 2 THEN
    RAISE EXCEPTION 'Expected 2 graph vertices, got %', graph_vertices;
  END IF;
END
$$;

SELECT 'stage-01-ok' AS result;
