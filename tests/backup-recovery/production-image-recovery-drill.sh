#!/usr/bin/env bash
set -euo pipefail

SOURCE_DATABASE_URL="${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL is required}"
TARGET_DATABASE_URL="${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/tests/backup-recovery/fixtures.sql" >/dev/null

psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

SELECT *
FROM ag_catalog.cypher(
  'vibe_stage01',
  $$ CREATE (p:Person {name: 'Stage17RecoveryProbe'}) RETURN p $$
) AS (p ag_catalog.agtype);
SQL

source_extensions="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT string_agg(extname, ',' ORDER BY extname) FROM pg_extension WHERE extname IN ('age','vector')")"
[[ "$source_extensions" == "age,vector" ]] || {
  echo "PRODUCTION_RECOVERY_DRILL_ERROR: source extensions missing: $source_extensions" >&2
  exit 20
}

source_vector="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT count(*) || ':' || min(embedding::text) FROM vibe_meta.extension_probe")"
source_graph="$(psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -Atq <<'SQL'
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT count(*)
FROM ag_catalog.cypher(
  'vibe_stage01',
  $$ MATCH (p:Person {name: 'Stage17RecoveryProbe'}) RETURN p $$
) AS (p ag_catalog.agtype);
SQL
)"
source_migrations="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT md5(string_agg(version || ':' || checksum, ',' ORDER BY version)) FROM vibe_meta.schema_migrations")"

backup_started="$(date +%s%N)"
DATABASE_URL="$SOURCE_DATABASE_URL" bash "$ROOT/scripts/vibedb-backup.sh" "$WORK"
backup_finished="$(date +%s%N)"

manifest="$(find "$WORK" -name '*.manifest.json' -print -quit)"
dump="$(find "$WORK" -name '*.dump' -print -quit)"

# RPO boundary evidence: this commit happens after the dump snapshot and must
# therefore be absent from the restored recovery point.
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO vibe_meta.backup_drill_fixture (id,tenant_id,payload) VALUES (2,'tenant-stage17','post-backup-not-restored')" >/dev/null

target_admin_url="${TARGET_DATABASE_URL%/*}/postgres"
target_db="${TARGET_DATABASE_URL##*/}"

psql "$target_admin_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$target_db\" WITH (FORCE)" >/dev/null
psql "$target_admin_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$target_db\"" >/dev/null

restore_started="$(date +%s%N)"
DATABASE_URL="$TARGET_DATABASE_URL" VIBEDB_RESTORE_MODE=fresh bash "$ROOT/scripts/vibedb-restore.sh" "$dump" "$manifest" >/dev/null
restore_finished="$(date +%s%N)"

target_extensions="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT string_agg(extname, ',' ORDER BY extname) FROM pg_extension WHERE extname IN ('age','vector')")"
target_vector="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT count(*) || ':' || min(embedding::text) FROM vibe_meta.extension_probe")"
target_graph="$(psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -Atq <<'SQL'
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT count(*)
FROM ag_catalog.cypher(
  'vibe_stage01',
  $$ MATCH (p:Person {name: 'Stage17RecoveryProbe'}) RETURN p $$
) AS (p ag_catalog.agtype);
SQL
)"
target_migrations="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT md5(string_agg(version || ':' || checksum, ',' ORDER BY version)) FROM vibe_meta.schema_migrations")"
target_pre_snapshot="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT count(*) FROM vibe_meta.backup_drill_fixture WHERE payload = 'recovery-proof'")"
target_post_snapshot="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT count(*) FROM vibe_meta.backup_drill_fixture WHERE payload = 'post-backup-not-restored'")"

[[ "$target_extensions" == "age,vector" ]] || {
  echo "PRODUCTION_RECOVERY_DRILL_ERROR: restored extensions missing: $target_extensions" >&2
  exit 21
}
[[ "$source_vector" == "$target_vector" ]] || {
  echo "PRODUCTION_RECOVERY_DRILL_ERROR: pgvector object/data mismatch" >&2
  exit 22
}
[[ "$source_graph" == "$target_graph" && "$target_graph" == "1" ]] || {
  echo "PRODUCTION_RECOVERY_DRILL_ERROR: AGE graph object/data mismatch source=$source_graph target=$target_graph" >&2
  exit 23
}
[[ "$source_migrations" == "$target_migrations" ]] || {
  echo "PRODUCTION_RECOVERY_DRILL_ERROR: migration ledger mismatch" >&2
  exit 24
}
[[ "$target_pre_snapshot" == "1" && "$target_post_snapshot" == "0" ]] || {
  echo "PRODUCTION_RECOVERY_DRILL_ERROR: recovery-point boundary mismatch pre=$target_pre_snapshot post=$target_post_snapshot" >&2
  exit 25
}

backup_ms="$(( (backup_finished-backup_started)/1000000 ))"
restore_ms="$(( (restore_finished-restore_started)/1000000 ))"

echo "{\"version\":\"v1\",\"status\":\"passed\",\"backup_duration_ms\":$backup_ms,\"restore_duration_ms\":$restore_ms,\"extensions\":\"$target_extensions\",\"restore_evidence\":\"fresh-db-age-pgvector-migrations-equal\"}"
