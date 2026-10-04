# @vibeplatform/cli

The Vibe CLI is a thin developer tool over the JavaScript SDK and Schema Catalog.

## Configuration

`vibe config set --base-url https://api.example` stores only the base URL in `.vibe/config.json`.

Authentication is supplied through `VIBE_TOKEN`; tokens are never written to project configuration.

## Graph query

```bash
vibe graph query --graph vibe_security --label Account --select name --eq name=Alice --limit 25
```

## Graph mutation

```bash
vibe graph create-vertex --graph vibe_security --label Account --property name=Alice
```

## Schema types

```bash
vibe schema types --file catalog.json --out vibe.d.ts
```

## Migrations

Migrations are forward-only SQL files in `migrations/` named `NNNN_snake_case_name.sql`.

```bash
vibe migrate new add_accounts      # scaffold the next numbered file
vibe migrate status                # applied vs pending
vibe migrate up --dry-run          # preview only, no writes
vibe migrate up                    # apply pending migrations
vibe migrate verify                # fail if an applied file was modified or is missing
```

The connection string is supplied only through `VIBE_MIGRATOR_URL` and is never stored. The CLI connects only as the approved `vibe_migrator` role and refuses superuser, `BYPASSRLS`, `CREATEROLE`, `CREATEDB` or `REPLICATION` roles. Each migration runs in its own transaction under an advisory lock, is recorded in `vibe_meta.schema_migrations` with a SHA-256 checksum, and rolls back entirely on failure. Migration files must not contain `BEGIN`/`COMMIT`. The CLI never accepts SQL on the command line.

Prerequisites are bootstrap, not migrations: Stage 01 roles/schemas, Stage 03 Supabase compatibility roles, and Stage 04 Schema Catalog tables.

## Remote Schema Catalog

```bash
VIBE_TOKEN=<jwt> vibe schema inspect --base-url https://api.example
VIBE_TOKEN=<jwt> vibe schema pull --out vibe.d.ts --catalog-out catalog.json
```

Contract: `GET {baseUrl}/rpc/vibe_schema_catalog` (override with `--catalog-path`) with `Authorization: Bearer $VIBE_TOKEN`, returning `{"catalog_version":"v1","graphs":{"<graph>":{"labels":[...],"edges":[{"name","from","to"}]}}}`. The response is validated before use. Plain `http://` is refused except for loopback hosts, and redirects are not followed. The endpoint is installed by migration `0001_expose_schema_catalog.sql`.

## Diagnostics/local development

- `vibe diagnostics` checks the configured `/health` endpoint.
- `vibe local status` delegates to `docker compose ps`.

The CLI does not compile Vibe IR, authorize tenants, bypass RLS, or accept raw SQL/Cypher. Server-side validation remains authoritative.
