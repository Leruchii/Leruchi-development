# Leruchi Canonical Name Migration

Status: **CANONICAL BRAND AND SDK/CLI SOURCE PATHS INTEGRATED; EXTERNAL PROTOCOL MIGRATIONS REMAIN SEPARATE**

## Decision

The product owner's canonical name is **Leruchi**. Product-facing names in UI, documentation, package metadata and MCP server metadata must use Leruchi. The old VibeDB/Vibe naming must not be introduced in new product-facing surfaces.

## Phase 1 scope

- Set root, SDK, CLI, Studio, Graph API and Schema Catalog API package metadata to the `@leruchi/*` namespace.
- Publish `leruchi` as the primary CLI command while retaining `vibe` as a compatibility alias.
- Update active SDK/CLI/MCP documentation and MCP tool descriptions to Leruchi.
- Update Studio page metadata and the visible application wordmark to Leruchi.
- Preserve Node.js 24-only support.
- Prefer `.leruchi/config.json`, `LERUCHI_BASE_URL`, `LERUCHI_TOKEN`, `LERUCHI_API_URL`, `LERUCHI_MCP_ACCESS_TOKEN`, `LERUCHI_MIGRATOR_DATABASE_URL`, and `LERUCHI_*` Graph API settings; keep `.vibe/` and corresponding `VIBE_*` values as tested fallbacks. Studio prefers the `leruchi_access_token` cookie and accepts the old cookie during migration.

## Deliberately not changed in Phase 1

- The signed capability-grant audience `aud=vibedb` is a protocol compatibility value, not UI branding. Changing it requires coordinated issuer, verifier, fixtures, token-version policy and rollout/rollback tests.
- Phase 2 source-directory migration is integrated: SDK and CLI now live at `packages/leruchi-sdk` and `packages/leruchi-cli`, with imports, workflow filters, scripts and documentation updated. Persisted protocol identifiers remain unchanged.
- `VibeClientError` remains an exported compatibility alias for `LeruchiClientError`; generated `VibeGraph`/`VibeLabel` types remain aliases while canonical `LeruchiGraph`/`LeruchiLabel` are primary.
- Database schema identifiers, migration history, existing `vibedb.dev` schema `$id` values and persisted values are not renamed by text replacement; any public identifier change requires a versioned compatibility plan.

## Required follow-up phases

1. Complete the versioned migration for the JWT audience and any externally consumed MCP identity; do not accept a broader audience without a threat-model review.
2. Continue auditing public examples and compatibility aliases; canonical `LERUCHI_*` environment settings should take precedence while documented `VIBE_*` fallbacks remain tested where compatibility is required.
3. Keep the signed capability-grant audience `aud=vibedb` and other externally consumed protocol/schema identifiers unchanged until a versioned migration and rollback plan is approved.
4. Run relevant Node.js 24 tests, type/build checks, architecture audit, Stage State Gate and repository-wide workflows on the exact PR head.

## Release gate

This rename PR does not change repository visibility, publish packages, merge to main, tag a release or publish the OSS export. The product name is an owner decision; legal/trademark/domain clearance remains a separate release gate.
