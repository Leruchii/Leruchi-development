# Stage 11 — CLI

## Decision

The CLI remains a thin developer-plane wrapper over Vibe SDK and Schema Catalog contracts.

## Security boundary

The CLI does not:
- compile Query IR or Mutation IR;
- authorize tenants;
- accept raw Cypher or SQL for graph operations;
- store bearer tokens in project configuration;
- bypass PostgreSQL RLS.

Authentication is supplied through environment-controlled VIBE_TOKEN for API calls. Project configuration stores only non-secret connection metadata.

## Migration contract

Migrations are:
- numbered, forward-only SQL files under infra/migrations/;
- executed only through a connection authenticated as vibe_migrator;
- run with psql ON_ERROR_STOP and a single transaction unless a future migration explicitly documents a non-transactional requirement;
- recorded atomically in vibe_meta.schema_migrations;
- immutable after application; fixes require a later migration.

This uses PostgreSQL's transactional psql behavior to prevent partial migration application. Non-transactional operations such as concurrent index creation require an explicit future runner mode rather than silently violating the contract. PostgreSQL psql and CREATE INDEX documentation

## Remote Schema Catalog contract

GET /v1/schema/catalog returns a versioned v1 catalog derived from the authoritative database catalog.

The API:
- verifies a signed HS256 bearer token;
- requires a trusted tenant_id claim;
- passes verified claims into PostgreSQL request context;
- queries the catalog through the non-BYPASSRLS runtime role;
- therefore returns shared graph metadata plus only the caller's tenant-owned graph metadata.

The CLI can inspect the remote catalog and generate types from it. It does not reimplement catalog discovery.

Production tenant-claim issuance remains a separate Auth design decision and must not be inferred from this CI token mechanism.

## Automated issue detection

Repository CI now includes:
- migration-chain checks;
- catalog tenant/RLS checks;
- runtime/migrator role checks;
- security-definer search_path checks;
- SDK/CLI compiler-boundary checks;
- remote Schema Catalog tenant-isolation integration tests.

Status: IN_PROGRESS pending Stage 04 revalidation and Stage 11 CI evidence.
