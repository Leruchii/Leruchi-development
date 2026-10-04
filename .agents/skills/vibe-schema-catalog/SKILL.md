---
name: vibe-schema-catalog
description: Build and maintain VibePlatform's authoritative relational, graph, vector and policy metadata catalog.
---

# Vibe Schema Catalog Skill

The Schema Catalog is the authoritative metadata boundary for later Vibe layers.

## Rules

- The catalog is versioned and deterministic.
- It represents relational, graph, vector and policy metadata in one stable model.
- PostgreSQL system catalogs may be used internally to populate it, but later layers consume the Vibe catalog contract rather than raw implementation catalogs.
- Graph labels and edge relationships are explicitly registered until graph reflection is justified.
- Do not invent graph metadata from UI state.
- Do not weaken RLS or grant elevated roles to runtime clients for catalog generation.
- Metadata exposure is not authorization.
- Do not add a second schema registry or metadata service.

## Required catalog domains

1. relational tables;
2. relational columns;
3. foreign-key relationships;
4. graph labels;
5. graph edge types;
6. graph edge endpoints;
7. graph properties;
8. vector columns and dimensions;
9. RLS policy metadata.

## Workflow

1. Inspect current database schemas and security boundaries.
2. Define the smallest stable catalog schema.
3. Add deterministic population/registration.
4. Add least-privilege runtime read access.
5. Add executable tests.
6. Verify deterministic output.
7. Update knowledge only from evidence.

## Forbidden

- automatic graph reflection;
- UI-owned metadata;
- Query IR implementation;
- compiler implementation;
- raw system-catalog access by future client surfaces.
