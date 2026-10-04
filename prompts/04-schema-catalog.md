# Build Prompt 04 — Schema Catalog

## Mission

Create the authoritative, programmatically inspectable Schema Catalog that later validation, compilers, SDK generation, MCP and Graph Studio can consume.

## Required reading

Before changing anything:

1. Read AGENTS.md.
2. Read:
   - knowledge/architecture.md
   - knowledge/database.md
   - knowledge/security.md
   - knowledge/testing.md
   - knowledge/decisions/unknowns-and-contradictions.md
3. Load:
   - .agents/skills/vibe-postgres/SKILL.md
   - .agents/skills/vibe-age/SKILL.md
   - .agents/skills/vibe-supabase/SKILL.md
   - .agents/skills/vibe-schema-catalog/SKILL.md
4. Inspect the current database initialization and tests.

## Scope

Implement only the Schema Catalog foundation.

The catalog must represent:

- relational tables and columns;
- relational relationships/foreign keys;
- graph labels and edge types;
- graph relationship endpoints;
- relevant graph properties;
- vector column metadata;
- RLS policy metadata.

The catalog must have a version and deterministic representation.

Graph metadata is explicitly registered for now. Do not build automatic graph reflection or a second graph metadata engine.

## Security

- The catalog is metadata, not an authorization bypass.
- Do not expose policy metadata or protected schema metadata through a public API yet.
- Runtime access must remain least-privilege.
- Do not weaken RLS to populate or read the catalog.

## Do not implement

Query IR, Graph API, SDK, CLI, Graph Studio, MCP, GraphRAG, Cloud or billing.

## Exit gate

An executable test must prove:

- catalog objects exist;
- relational metadata is present;
- graph metadata is present;
- vector metadata is present;
- policy metadata is present;
- the catalog has a deterministic version;
- vibe_runtime can read approved catalog metadata without superuser or BYPASSRLS privileges;
- later layers can consume the catalog without querying implementation-specific catalogs directly.

Report changes, tests, decisions, security implications, UNKNOWNs and next stage.
