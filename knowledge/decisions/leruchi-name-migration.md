# Leruchi Canonical Name Migration

Status: **IN PROGRESS — PHASE 1 IMPLEMENTED ON BRANCH**

## Decision

The product owner's canonical name is **Leruchi**. Product-facing names in UI, documentation, package metadata and MCP server metadata must use Leruchi. The old VibeDB/Vibe naming must not be introduced in new product-facing surfaces.

## Phase 1 scope

- Set root, SDK, CLI, Studio, Graph API and Schema Catalog API package metadata to the `@leruchi/*` namespace.
- Publish `leruchi` as the primary CLI command while retaining `vibe` as a compatibility alias.
- Update active SDK/CLI/MCP documentation and MCP tool descriptions to Leruchi.
- Update Studio page metadata and the visible application wordmark to Leruchi.
- Preserve Node.js 24-only support.
- Preserve the current `.vibe/` config directory and existing `VIBE_*` runtime environment variables until canonical `LERUCHI_*` variables with old-name fallback are implemented and tested.

## Deliberately not changed in Phase 1

- The signed capability-grant audience `aud=vibedb` is a protocol compatibility value, not UI branding. Changing it requires coordinated issuer, verifier, fixtures, token-version policy and rollout/rollback tests.
- Internal source directories and import paths such as `packages/vibe-sdk` and `packages/vibe-cli` remain temporarily stable until references and CI have been inventoried.
- Existing `VibeClientError` and other exported symbols remain stable until compatibility aliases and deprecation policy are implemented.
- Database schema identifiers, migration history, existing `vibedb.dev` schema `$id` values and persisted values are not renamed by text replacement; any public identifier change requires a versioned compatibility plan.

## Required follow-up phases

1. Implement `LERUCHI_*` environment variables with explicit fallback to existing `VIBE_*` variables; test precedence and ensure secrets never enter config files.
2. Add compatibility aliases for SDK exports and generated types; update public docs/examples to canonical Leruchi names.
3. Decide and test a versioned migration for the JWT audience and MCP identity; do not accept a broader audience without a threat-model review.
4. Rename source directories and executable filenames only after all imports, workflows, build scripts, prompts and developer documentation have been enumerated.
5. Add a CI naming audit that blocks new active user-facing VibeDB branding while allowlisting documented compatibility identifiers and historical decision records.
6. Run relevant Node.js 24 tests, type/build checks, architecture audit, Stage State Gate and repository-wide workflows on the exact PR head.

## Release gate

This rename PR does not change repository visibility, publish packages, merge to main, tag a release or publish the OSS export. The product name is an owner decision; legal/trademark/domain clearance remains a separate release gate.
