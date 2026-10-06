#!/usr/bin/env bash
set -euo pipefail

export PGPASSWORD=runtime

echo "== PostgreSQL =="
psql --host=127.0.0.1 --port=5432 --username=vibe_runtime --dbname=leruchi -XAtc "SELECT version();"

echo "== Extensions =="
psql --host=127.0.0.1 --port=5432 --username=vibe_runtime --dbname=leruchi -XAtc   "SELECT extname || '=' || extversion FROM pg_extension WHERE extname IN ('age','vector') ORDER BY extname;"

echo "== Stage 01 assertions =="
psql --host=127.0.0.1 --port=5432 --username=vibe_runtime --dbname=leruchi -Xf tests/db/stage-01.sql

echo "Stage 01 database smoke test passed."
