# Stage 11 — CLI

## Decision

The CLI is a thin developer-plane wrapper over the validated JavaScript SDK and Schema Catalog contracts. It is not a second compiler or security boundary.

## Security boundary

The CLI does not:
- compile Query IR or Mutation IR;
- authorize tenants;
- accept raw Cypher or SQL for graph operations, or SQL on the command line for migrations;
- store bearer tokens or database connection strings in project configuration;
- bypass PostgreSQL RLS.

Authentication is supplied through environment variables only: `VIBE_TOKEN` (API bearer) and `VIBE_MIGRATOR_URL` (migrator database connection).

## Migration execution contract (DECIDED)

- Forward-only SQL files in `migrations/`, named `NNNN_snake_case_name.sql`; versions are unique and strictly ordered; symlinks, NUL bytes, empty or >1 MiB files are rejected.
- Executed only as `vibe_migrator`. After connecting, the CLI verifies `current_user = session_user = vibe_migrator` and that the role is not superuser, BYPASSRLS, CREATEROLE, CREATEDB or REPLICATION; otherwise it refuses and closes the connection. There is no override.
- Each migration runs in its own transaction, serialized by an advisory lock, with `lock_timeout` 10s and `statement_timeout` 120s. Failure rolls back the migration and its tracking row.
- Files must not contain transaction control (`BEGIN`/`COMMIT`/`ROLLBACK`/`START TRANSACTION`); a static check plus a transaction-timestamp check after execution detect early termination. `CREATE INDEX CONCURRENTLY` and other non-transactional statements are unsupported.
- Tracking table `vibe_meta.schema_migrations` (version, name, checksum SHA-256, applied_at, applied_by), owned by the migrator and not granted to the runtime role.
- Drift is refused: modified applied files, missing files, renamed files and out-of-order (older-than-latest) pending files fail `up` and `verify`.
- `VIBE_MIGRATOR_URL` is never stored and is redacted from errors.
- Bootstrap (Stage 01 init, Stage 03 compatibility roles, Stage 04 catalog SQL) is not a migration; migrations apply on top of it.

## Remote Schema Catalog contract (DECIDED)

- Served by PostgREST (Supabase compatibility core): `GET /rpc/vibe_schema_catalog`, installed by migration `0001_expose_schema_catalog.sql` as a `SECURITY DEFINER` function with pinned `search_path`, `EXECUTE` revoked from PUBLIC and granted to `authenticated` only. The migration issues `NOTIFY pgrst, 'reload schema'`.
- Response: `{catalog_version:"v1", graphs:{<graph>:{labels:[], edges:[{name,from,to}]}}}`. Names only; no properties, policies, or row data.
- The CLI requires `VIBE_TOKEN`, refuses bearer tokens over non-loopback plain http, does not follow redirects, applies a 15s timeout and 2 MB cap, validates the response (version, identifier syntax, prototype-pollution keys, size limits) and never prints server response bodies on failure.
- Catalog structure is shared across tenants in v1 (tested). Per-tenant catalog filtering is UNKNOWN/DEFERRED until graphs are tenant-scoped.
- The default route is PostgREST-specific; a future Graph API route can be selected with `--catalog-path` once that server contract exists.

## Remaining unknowns

- Per-tenant catalog visibility (see above).
- Rollback/down migrations are intentionally not supported (forward-only).
- Whether remote catalog inspection should move behind the future Graph API instead of PostgREST.
