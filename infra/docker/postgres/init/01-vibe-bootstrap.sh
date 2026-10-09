#!/usr/bin/env bash
set -euo pipefail

LERUCHI_MIGRATOR_PASSWORD="${LERUCHI_MIGRATOR_PASSWORD:-${VIBE_MIGRATOR_PASSWORD:-}}"
LERUCHI_RUNTIME_PASSWORD="${LERUCHI_RUNTIME_PASSWORD:-${VIBE_RUNTIME_PASSWORD:-}}"
LERUCHI_REALTIME_PASSWORD="${LERUCHI_REALTIME_PASSWORD:-${VIBE_REALTIME_PASSWORD:-}}"

: "${LERUCHI_MIGRATOR_PASSWORD:?LERUCHI_MIGRATOR_PASSWORD (or legacy VIBE_MIGRATOR_PASSWORD) is required}"
: "${LERUCHI_RUNTIME_PASSWORD:?LERUCHI_RUNTIME_PASSWORD (or legacy VIBE_RUNTIME_PASSWORD) is required}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=vibe_migrator_password="$LERUCHI_MIGRATOR_PASSWORD" \
  --set=vibe_runtime_password="$LERUCHI_RUNTIME_PASSWORD" <<'SQL'
CREATE ROLE vibe_migrator
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'vibe_migrator_password';

CREATE ROLE vibe_runtime
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'vibe_runtime_password';

ALTER ROLE vibe_migrator SET search_path = "$user", public, ag_catalog;
ALTER ROLE vibe_runtime SET search_path = "$user", public, ag_catalog;

GRANT CONNECT ON DATABASE vibedb TO vibe_migrator, vibe_runtime;

-- AGE must exist before granting access to ag_catalog. Keeping this in the
-- bootstrap phase makes clean cluster initialization deterministic; the
-- foundation migration may safely repeat CREATE EXTENSION IF NOT EXISTS age.
CREATE EXTENSION IF NOT EXISTS age;

GRANT USAGE ON SCHEMA ag_catalog TO vibe_migrator, vibe_runtime;
GRANT EXECUTE ON FUNCTION ag_catalog.cypher(name, cstring, ag_catalog.agtype) TO vibe_migrator, vibe_runtime;
SQL

if [[ -n "$LERUCHI_REALTIME_PASSWORD" ]]; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --set=vibe_realtime_password="$LERUCHI_REALTIME_PASSWORD" <<'SQL'
CREATE ROLE vibe_realtime
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'vibe_realtime_password';

ALTER ROLE vibe_realtime SET search_path = "$user", public, ag_catalog;
GRANT CONNECT ON DATABASE vibedb TO vibe_realtime;
SQL
fi
