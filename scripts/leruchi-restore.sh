#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DATABASE_URL=postgresql://... LERUCHI_RESTORE_MODE=fresh|replace \
#     scripts/leruchi-restore.sh backup.dump backup.manifest.json
#
# fresh   -> restore into a newly-created empty database (no destructive cleanup)
# replace -> clean conflicting objects before restore
#
# The default remains replace for backward compatibility with the original
# Stage 17 in-place drill. Disaster-recovery automation should prefer fresh.

DUMP="${1:?dump file is required}"
MANIFEST="${2:?manifest file is required}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"
RESTORE_MODE="${LERUCHI_RESTORE_MODE:-replace}"

test -f "$DUMP" || { echo "RESTORE_ERROR: dump not found" >&2; exit 2; }
test -f "$MANIFEST" || { echo "RESTORE_ERROR: manifest not found" >&2; exit 2; }

version="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$MANIFEST")"
expected="$(sed -n 's/.*"sha256": "\([^"]*\)".*/\1/p' "$MANIFEST")"
expected_size="$(sed -n 's/.*"size_bytes": \([0-9][0-9]*\).*/\1/p' "$MANIFEST")"

[[ "$version" == "v1" && "$expected" =~ ^[0-9a-f]{64}$ && "$expected_size" =~ ^[0-9]+$ ]] || {
  echo "RESTORE_ERROR: unsupported or invalid manifest" >&2
  exit 4
}

actual="$(sha256sum "$DUMP" | awk '{print $1}')"
[[ "$expected" == "$actual" ]] || { echo "RESTORE_ERROR: checksum mismatch" >&2; exit 3; }

actual_size="$(wc -c < "$DUMP" | tr -d ' ')"
[[ "$expected_size" == "$actual_size" ]] || { echo "RESTORE_ERROR: size mismatch" >&2; exit 5; }

case "$RESTORE_MODE" in
  fresh)
    restore_args=(--dbname="$DATABASE_URL" --no-owner --no-acl)
    ;;
  replace)
    restore_args=(--dbname="$DATABASE_URL" --clean --if-exists --no-owner --no-acl)
    ;;
  *)
    echo "RESTORE_ERROR: invalid restore mode '$RESTORE_MODE' (expected fresh or replace)" >&2
    exit 6
    ;;
esac

start_ns="$(date +%s%N)"
pg_restore "${restore_args[@]}" "$DUMP"
end_ns="$(date +%s%N)"

printf '{"version":"v1","status":"restored","mode":"%s","restore_duration_ms":%s,"sha256":"%s"}\n' \
  "$RESTORE_MODE" "$(( (end_ns-start_ns)/1000000 ))" "$actual"
