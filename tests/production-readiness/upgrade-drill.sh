#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
ADMIN_DATABASE_URL="${ADMIN_DATABASE_URL:?ADMIN_DATABASE_URL is required}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Supported prior state: Stage 04 catalog baseline on top of the production
# PostgreSQL/AGE/pgvector foundation, before numbered migrations 0000+.
psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/infra/catalog/04-schema-catalog.sql" >/dev/null

psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO vibe_meta.graph_catalog_registry
  (tenant_id,graph_name,object_kind,object_name,from_label,to_label,properties)
VALUES
  ('tenant-upgrade','vibe_stage01','label','UpgradeProbe','','','{"source":"pre-migration"}')
ON CONFLICT DO NOTHING;
SQL

before_probe="$(psql "$ADMIN_DATABASE_URL" -Atqc "SELECT count(*) FROM vibe_meta.graph_catalog_registry WHERE tenant_id='tenant-upgrade' AND object_name='UpgradeProbe'")"
[[ "$before_probe" == "1" ]] || { echo "UPGRADE_DRILL_ERROR: prior-state probe missing" >&2; exit 30; }

LERUCHI_MIGRATOR_DATABASE_URL="$DATABASE_URL" node "$ROOT/packages/leruchi-cli/bin/leruchi.mjs" db migrate >/dev/null

ledger="$(psql "$ADMIN_DATABASE_URL" -Atqc "SELECT string_agg(migration_id,',' ORDER BY migration_id) FROM vibe_meta.schema_migrations")"
[[ "$ledger" == "0000-migration-ledger,0001-catalog-tenant-visibility,0002-graph-realtime-outbox,0003-vector-catalog" ]] || {
  echo "UPGRADE_DRILL_ERROR: unexpected migration ledger: $ledger" >&2
  exit 31
}

invalid_checksums="$(psql "$ADMIN_DATABASE_URL" -Atqc "SELECT count(*) FROM vibe_meta.schema_migrations WHERE checksum IS NULL OR checksum !~ '^[0-9a-f]{64}$'")"
[[ "$invalid_checksums" == "0" ]] || {
  echo "UPGRADE_DRILL_ERROR: migration checksums were not recorded" >&2
  exit 32
}

after_probe="$(psql "$ADMIN_DATABASE_URL" -Atqc "SELECT count(*) FROM vibe_meta.graph_catalog_registry WHERE tenant_id='tenant-upgrade' AND object_name='UpgradeProbe'")"
[[ "$after_probe" == "1" ]] || { echo "UPGRADE_DRILL_ERROR: prior-state data lost during upgrade" >&2; exit 33; }

# A second run must be safe and must not create duplicate ledger entries.
LERUCHI_MIGRATOR_DATABASE_URL="$DATABASE_URL" node "$ROOT/packages/leruchi-cli/bin/leruchi.mjs" db migrate >/dev/null
ledger_count="$(psql "$ADMIN_DATABASE_URL" -Atqc "SELECT count(*) FROM vibe_meta.schema_migrations")"
[[ "$ledger_count" == "4" ]] || { echo "UPGRADE_DRILL_ERROR: migration rerun was not idempotent" >&2; exit 34; }

# Migration drift must fail closed once a checksum has been adopted.
cp -R "$ROOT/infra/migrations" "$WORK/migrations"
printf '\n-- intentional Stage 20 drift probe\n' >> "$WORK/migrations/0003-vector-catalog.sql"
set +e
LERUCHI_MIGRATOR_DATABASE_URL="$DATABASE_URL"   node --input-type=module -e "import {runMigrations} from '$ROOT/packages/leruchi-cli/migrate.mjs'; await runMigrations({migrationsDir:'$WORK/migrations'});"   >"$WORK/tamper.out" 2>"$WORK/tamper.err"
tamper_status=$?
set -e
[[ "$tamper_status" -ne 0 ]] || { echo "UPGRADE_DRILL_ERROR: modified applied migration was accepted" >&2; exit 35; }
grep -q "Migration checksum mismatch: 0003-vector-catalog" "$WORK/tamper.err" || {
  echo "UPGRADE_DRILL_ERROR: checksum drift did not fail with expected error" >&2
  cat "$WORK/tamper.err" >&2
  exit 36
}

outbox_exists="$(psql "$ADMIN_DATABASE_URL" -Atqc "SELECT to_regclass('vibe_meta.graph_event_outbox') IS NOT NULL")"
vector_registry_exists="$(psql "$ADMIN_DATABASE_URL" -Atqc "SELECT to_regclass('vibe_meta.vector_catalog_registry') IS NOT NULL")"
[[ "$outbox_exists" == "t" && "$vector_registry_exists" == "t" ]] || {
  echo "UPGRADE_DRILL_ERROR: current schema objects missing after upgrade" >&2
  exit 37
}

echo '{"version":"v1","status":"passed","upgrade_path":"stage04-baseline-to-current","migrations":4,"checksum_drift_rejected":true,"prior_data_preserved":true}'
