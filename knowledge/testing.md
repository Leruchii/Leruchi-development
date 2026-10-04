# Testing

Status: VALIDATED through Stage 04 — Schema Catalog

## Core policy

Security tests are merge blockers.

No feature is VALIDATED without relevant executable evidence.

Every build prompt must report what changed, files, commands/tests, results, architecture decisions, security implications, remaining UNKNOWNs and next stage.

## Stage 04 executable coverage

.github/workflows/stage-04-schema-catalog.yml proves:

- the VibeDB image builds and starts;
- the catalog schema and v1 catalog objects install;
- catalog refresh is deterministic across repeated refreshes;
- relational table metadata is present;
- relational column metadata is present;
- vector metadata is present;
- RLS policy metadata is present;
- explicit graph label/edge metadata is present;
- vibe_runtime can read the catalog;
- vibe_runtime does not have superuser or BYPASSRLS privileges.

The catalog population uses PostgreSQL system catalogs internally because information_schema visibility is privilege-filtered. Future consumers do not query those implementation catalogs directly.

## Merge blocker

Stage 01 through Stage 04 workflows are executable evidence. Configuration-only claims are insufficient.
