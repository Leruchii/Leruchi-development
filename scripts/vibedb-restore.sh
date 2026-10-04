#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   DATABASE_URL=postgresql://... scripts/vibedb-restore.sh backup.dump backup.manifest.json

DUMP="${1:?dump file is required}"
MANIFEST="${2:?manifest file is required}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"

test -f "$DUMP" || { echo "RESTORE_ERROR: dump not found" >&2; exit 2; }
test -f "$MANIFEST" || { echo "RESTORE_ERROR: manifest not found" >&2; exit 2; }

expected="$(python3 - "$MANIFEST" <<'PY'
import json,sys
with open(sys.argv[1], encoding="utf-8") as f:
    data=json.load(f)
if data.get("version") != "v1":
    raise SystemExit("unsupported manifest version")
print(data["sha256"])
PY
)"
actual="$(sha256sum "$DUMP" | awk '{print $1}')"
[[ "$expected" == "$actual" ]] || { echo "RESTORE_ERROR: checksum mismatch" >&2; exit 3; }

start_ns="$(date +%s%N)"
pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner --no-acl "$DUMP"
end_ns="$(date +%s%N)"
printf '{"version":"v1","status":"restored","restore_duration_ms":%s,"sha256":"%s"}\n'   "$(( (end_ns-start_ns)/1000000 ))" "$actual"
