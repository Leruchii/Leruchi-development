CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS age;

CREATE SCHEMA IF NOT EXISTS vibe_app AUTHORIZATION vibe_migrator;
CREATE SCHEMA IF NOT EXISTS vibe_meta AUTHORIZATION vibe_migrator;

GRANT USAGE ON SCHEMA vibe_app, vibe_meta TO vibe_runtime;

CREATE TABLE vibe_meta.extension_probe (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  embedding vector(3) NOT NULL
);

ALTER TABLE vibe_meta.extension_probe ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.extension_probe FORCE ROW LEVEL SECURITY;

CREATE POLICY extension_probe_runtime_read
  ON vibe_meta.extension_probe FOR SELECT TO vibe_runtime USING (true);

GRANT SELECT ON vibe_meta.extension_probe TO vibe_runtime;

INSERT INTO vibe_meta.extension_probe (embedding)
VALUES ('[1,0,0]'), ('[0,1,0]'), ('[0,0,1]');

SELECT ag_catalog.create_graph('vibe_stage01');
SELECT ag_catalog.create_vlabel('vibe_stage01', 'Person');
SELECT ag_catalog.create_elabel('vibe_stage01', 'KNOWS');

GRANT USAGE ON SCHEMA vibe_stage01 TO vibe_migrator, vibe_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON vibe_stage01."Person", vibe_stage01."KNOWS" TO vibe_migrator, vibe_runtime;
