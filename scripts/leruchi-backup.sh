#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DATABASE_URL=postgresql://... scripts/leruchi-backup.sh /path/to/backup-dir
#
# Produces a self-describing custom-format dump plus a manifest. The manifest
# is intentionally generated from the dump itself so integrity can be checked
# before restore.

OUT_DIR="${1:?backup output directory is required}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
mkdir -p "$OUT_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
prefix="${LERUCHI_BACKUP_PREFIX:-leruchi}"
[[ "$prefix" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$ ]] || { echo "BACKUP_ERROR: invalid filename prefix" >&2; exit 2; }
dump="$OUT_DIR/$prefix-$timestamp.dump"
manifest="$OUT_DIR/$prefix-$timestamp.manifest.json"
tmp="$manifest.tmp"

start_ns="$(date +%s%N)"
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-acl --file="$dump"
end_ns="$(date +%s%N)"
duration_ms="$(( (end_ns-start_ns)/1000000 ))"

sha256="$(sha256sum "$dump" | awk '{print $1}')"
size_bytes="$(wc -c < "$dump" | tr -d ' ')"
server_version="$(psql "$DATABASE_URL" -Atqc 'SHOW server_version')"
pg_dump_version="$(pg_dump --version | awk '{print $NF}')"
migration_digest="$(psql "$DATABASE_URL" -Atqc "SELECT COALESCE(md5(string_agg(migration_id || ':' || COALESCE(checksum,''), ',' ORDER BY migration_id)), 'none') FROM vibe_meta.schema_migrations" 2>/dev/null || printf 'unavailable')"

cat > "$tmp" <<JSON
{
  "version": "v1",
  "artifact": "$(basename "$dump")",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "sha256": "$sha256",
  "size_bytes": $size_bytes,
  "backup_duration_ms": $duration_ms,
  "server_version": "$server_version",
  "pg_dump_version": "$pg_dump_version",
  "migration_digest": "$migration_digest"
}
JSON
mv "$tmp" "$manifest"
printf '%s\n' "$manifest"
