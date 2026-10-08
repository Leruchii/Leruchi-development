# Product Rename: Leruchi

**Decision date:** 2026-10-09  
**Decision owner:** Product owner  
**Canonical product name:** Leruchi  
**Status:** Engineering rename in progress; release remains gated.

## Decision

Leruchi is the canonical name across the application, UI, SDK, CLI, MCP server, package metadata, documentation, schemas, examples, infrastructure labels, test fixtures, and architecture. The former name is historical-only and must not be used as a current product identity.

## Compatibility policy

- Prefer `LERUCHI_*` environment variables; support legacy `VIBE_*` names temporarily where clients or deployment configuration may still depend on them.
- Make the `leruchi` CLI command primary. Retain `vibe` only as a temporary compatibility alias until a documented deprecation window is complete.
- Do not change persisted identifiers, migration history, database roles, package filesystem paths, HTTP headers, or public API contracts solely for branding without a specific migration plan and regression coverage.
- Any remaining legacy identifiers must be explicitly tracked, not silently treated as complete rename coverage.

## Validation gates

1. Search active product surfaces for former-name references and classify each remaining occurrence as historical or compatibility-only.
2. Verify package manifests, lockfiles, local file dependencies, CLI command help, config discovery, Studio metadata, MCP metadata, capability-grant audience, and all relevant tests.
3. Run the Node.js 24 build and complete repository regression matrix on the final PR head.
4. Keep the rename PR open until required checks pass; do not merge automatically.
5. Public OSS publication remains blocked until formal trademark/domain/package/namespace clearance and the repository visibility/security gate are recorded as complete.

## Initial implementation notes

The current draft PR updates the Studio title, MCP tool descriptions, capability audience, SDK/CLI package names and directories (`packages/leruchi-sdk`, `packages/leruchi-cli`), SDK tests, product documentation, database/test fixtures, workflow references, and OSS export metadata. Backup/restore scripts and the database bootstrap script now use Leruchi filenames. Legacy `VIBE_*` environment variables remain temporary fallback aliases; the `.agents/skills/vibe-*` internal skill paths and historical references still require an explicit compatibility review before claiming every identifier is migrated.
