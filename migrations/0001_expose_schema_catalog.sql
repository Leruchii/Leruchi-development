-- Exposes the Schema Catalog v1 structural summary (graphs, labels, edges) to authenticated API clients
-- through PostgREST at /rpc/vibe_schema_catalog. This is the remote contract consumed by `vibe schema pull`.
--
-- Prerequisites (bootstrap, not migrations): Stage 01 roles/schemas, Stage 04 Schema Catalog tables,
-- Stage 03 Supabase compatibility roles (`authenticated`).
--
-- Security: SECURITY DEFINER with a pinned search_path. It returns names only (graph, label, edge
-- types); it never returns row data, policies, or properties. EXECUTE is revoked from PUBLIC and
-- granted to `authenticated` only, so unauthenticated (anon) callers are refused.

CREATE OR REPLACE FUNCTION vibe_app.vibe_schema_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT jsonb_build_object(
    'catalog_version', 'v1',
    'graphs', COALESCE((
      SELECT jsonb_object_agg(g.graph_name, g.graph_doc ORDER BY g.graph_name)
      FROM (
        SELECT
          r.graph_name,
          jsonb_build_object(
            'labels', COALESCE(
              jsonb_agg(r.object_name ORDER BY r.object_name) FILTER (WHERE r.object_kind = 'label'),
              '[]'::jsonb
            ),
            'edges', COALESCE(
              jsonb_agg(
                jsonb_build_object('name', r.object_name, 'from', r.from_label, 'to', r.to_label)
                ORDER BY r.object_name, r.from_label, r.to_label
              ) FILTER (WHERE r.object_kind = 'edge'),
              '[]'::jsonb
            )
          ) AS graph_doc
        FROM vibe_meta.graph_catalog_registry r
        GROUP BY r.graph_name
      ) g
    ), '{}'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION vibe_app.vibe_schema_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vibe_app.vibe_schema_catalog() TO authenticated;

NOTIFY pgrst, 'reload schema';
