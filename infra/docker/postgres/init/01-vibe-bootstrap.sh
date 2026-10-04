#!/usr/bin/env bash
set -euo pipefail

: "${VIBE_MIGRATOR_PASSWORD:?VIBE_MIGRATOR_PASSWORD is required}"
: "${VIBE_RUNTIME_PASSWORD:?VIBE_RUNTIME_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=vibe_migrator_password="$VIBE_MIGRATOR_PASSWORD" \
  --set=vibe_runtime_password="$VIBE_RUNTIME_PASSWORD" <<'SQL'
CREATE ROLE vibe_migrator
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'vibe_migrator_password';

CREATE ROLE vibe_runtime
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'vibe_runtime_password';

ALTER ROLE vibe_migrator SET search_path = "$user", public, ag_catalog;
ALTER ROLE vibe_runtime SET search_path = "$user", public, ag_catalog;

GRANT CONNECT ON DATABASE vibedb TO vibe_migrator, vibe_runtime;
GRANT USAGE ON SCHEMA ag_catalog TO vibe_migrator, vibe_runtime;
GRANT EXECUTE ON FUNCTION ag_catalog.cypher(name, cstring, agtype) TO vibe_migrator, vibe_runtime;
SQL
