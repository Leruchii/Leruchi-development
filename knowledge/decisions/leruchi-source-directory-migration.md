# Leruchi SDK/CLI Source Directory Migration

Status: IMPLEMENTED — NOT YET VALIDATED on branch `stage32-sdk-cli-directory-migration`.

## Decision

The canonical internal source directories are:

- `packages/leruchi-sdk`
- `packages/leruchi-cli`

The old `packages/vibe-sdk` and `packages/vibe-cli` directories are removed only after source files have been copied and references updated in the same reviewable branch.

## Scope

The migration includes:

- SDK and CLI source files and package metadata;
- CLI executable path, with `leruchi` canonical and `vibe` retained as a deliberate compatibility command alias;
- SDK local-file dependency in the CLI package;
- imports in tests and operational scripts;
- CI workflow path filters and import smoke-test paths;
- architecture/production-readiness audit paths;
- BUILD_STATE, BUILD_PLAN, decision records and user-facing documentation.

The current hardened migration runner must be preserved. Do not replace it with a stale implementation from a candidate branch.

## Explicitly out of scope

- No changes to persisted database schema/migration identifiers.
- No changes to JWT audiences, signing protocol values, or externally consumed schema IDs.
- No changes to public repository visibility, release tags, or OSS export.
- No removal of documented Vibe-era environment/config or exported SDK compatibility aliases without separate compatibility evidence.

## Validation gate

Before merge:

1. no source imports or scripts reference the removed source directories;
2. package metadata resolves the SDK from `../leruchi-sdk`;
3. the `leruchi` and compatibility `vibe` executable aliases both point to the existing `bin/leruchi.mjs`;
4. focused SDK, CLI, migration and agent-surface tests pass;
5. production-readiness audit, Architecture Regression Audit and Stage State Gate pass;
6. all required workflows pass on the exact PR head;
7. BUILD_STATE records the exact validated SHA.

