\set ON_ERROR_STOP on
SET lock_timeout = '5s';
SET statement_timeout = '30s';

DO $vibe$
BEGIN
  IF current_user <> 'vibe_migrator' THEN
    RAISE EXCEPTION 'Vibe migrations must run as vibe_migrator; current_user=%', current_user;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'vibe_meta') THEN
    RAISE EXCEPTION 'vibe_meta schema must be provisioned before migrations';
  END IF;
END $vibe$;

CREATE TABLE IF NOT EXISTS vibe_meta.graph_event_outbox (
  event_seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id text NOT NULL UNIQUE,
  tenant_id text NOT NULL,
  graph_name text NOT NULL,
  event_type text NOT NULL DEFAULT 'graph.mutation.v1',
  operation text NOT NULL CHECK (operation IN (
    'create_vertex','create_edge','update_vertex','update_edge','delete_vertex','delete_edge'
  )),
  target_kind text NOT NULL CHECK (target_kind IN ('vertex','edge')),
  target_label text NOT NULL,
  target_id text NOT NULL,
  request_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  claimed_by text,
  claimed_at timestamptz,
  published_at timestamptz,
  last_error text
);

ALTER TABLE vibe_meta.graph_event_outbox OWNER TO vibe_migrator;
ALTER TABLE vibe_meta.graph_event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_meta.graph_event_outbox FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS graph_event_outbox_runtime_visibility ON vibe_meta.graph_event_outbox;
CREATE POLICY graph_event_outbox_runtime_visibility
  ON vibe_meta.graph_event_outbox FOR SELECT
  TO PUBLIC
  USING (
    tenant_id = COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::json ->> 'tenant_id'
  );

DROP POLICY IF EXISTS graph_event_outbox_runtime_insert ON vibe_meta.graph_event_outbox;
CREATE POLICY graph_event_outbox_runtime_insert
  ON vibe_meta.graph_event_outbox FOR INSERT
  TO vibe_runtime
  WITH CHECK (
    tenant_id = COALESCE(
      current_setting('request.jwt.claims', true)::json ->> 'tenant_id',
      ''
    )
  );

DROP POLICY IF EXISTS graph_event_outbox_relay_maintenance ON vibe_meta.graph_event_outbox;
CREATE POLICY graph_event_outbox_relay_maintenance
  ON vibe_meta.graph_event_outbox FOR ALL
  TO vibe_realtime
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS graph_event_outbox_migrator_maintenance ON vibe_meta.graph_event_outbox;
CREATE POLICY graph_event_outbox_migrator_maintenance
  ON vibe_meta.graph_event_outbox FOR ALL
  TO vibe_migrator
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS graph_event_outbox_pending_idx
  ON vibe_meta.graph_event_outbox (available_at, event_seq)
  WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS graph_event_outbox_tenant_cursor_idx
  ON vibe_meta.graph_event_outbox (tenant_id, event_seq);

GRANT SELECT, INSERT ON vibe_meta.graph_event_outbox TO vibe_runtime;
GRANT USAGE, SELECT ON SEQUENCE vibe_meta.graph_event_outbox_event_seq_seq TO vibe_runtime, vibe_realtime;
GRANT SELECT, UPDATE ON vibe_meta.graph_event_outbox TO vibe_realtime;

INSERT INTO vibe_meta.schema_migrations (migration_id)
VALUES ('0002-graph-realtime-outbox')
ON CONFLICT (migration_id) DO NOTHING;

SELECT 'graph-realtime-outbox-migration-ok' AS result;
