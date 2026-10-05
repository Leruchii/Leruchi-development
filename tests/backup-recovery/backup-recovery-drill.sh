#!/usr/bin/env bash
set -euo pipefail
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/tests/backup-recovery/fixtures.sql" >/dev/null
before="$(psql "$DATABASE_URL" -Atqc "SELECT id || ':' || tenant_id || ':' || payload FROM vibe_meta.backup_drill_fixture ORDER BY id")"
before_migrations="$(psql "$DATABASE_URL" -Atqc "SELECT md5(string_agg(version || ':' || checksum, ',' ORDER BY version)) FROM vibe_meta.schema_migrations")"
backup_started="$(date +%s%N)"
bash "$ROOT/scripts/vibedb-backup.sh" "$WORK"
backup_finished="$(date +%s%N)"
manifest="$(find "$WORK" -name '*.manifest.json' -print -quit)"
dump="$(find "$WORK" -name '*.dump' -print -quit)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "TRUNCATE vibe_meta.backup_drill_fixture" >/dev/null
restore_started="$(date +%s%N)"
VIBEDB_RESTORE_MODE=replace bash "$ROOT/scripts/vibedb-restore.sh" "$dump" "$manifest" >/dev/null
restore_finished="$(date +%s%N)"
after="$(psql "$DATABASE_URL" -Atqc "SELECT id || ':' || tenant_id || ':' || payload FROM vibe_meta.backup_drill_fixture ORDER BY id")"
after_migrations="$(psql "$DATABASE_URL" -Atqc "SELECT md5(string_agg(version || ':' || checksum, ',' ORDER BY version)) FROM vibe_meta.schema_migrations")"
[[ "$before" == "$after" ]] || { echo "RECOVERY_DRILL_ERROR: fixture data mismatch" >&2; exit 10; }
[[ "$before_migrations" == "$after_migrations" ]] || { echo "RECOVERY_DRILL_ERROR: migration ledger mismatch" >&2; exit 11; }
backup_ms="$(( (backup_finished-backup_started)/1000000 ))"
restore_ms="$(( (restore_finished-restore_started)/1000000 ))"
echo "{\"version\":\"v1\",\"status\":\"passed\",\"backup_duration_ms\":$backup_ms,\"restore_duration_ms\":$restore_ms,\"restore_evidence\":\"fixture-and-migration-ledger-equal\"}"
