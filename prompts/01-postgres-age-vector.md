# Build Prompt 01 — PostgreSQL + AGE + pgvector Spike

## Mission

Prove the VibePlatform database foundation before implementing higher-level product surfaces.

## Required reading

Before changing anything:

1. Read `AGENTS.md`.
2. Read:
   - `knowledge/architecture.md`
   - `knowledge/database.md`
   - `knowledge/security.md`
   - `knowledge/testing.md`
3. Load:
   - `.agents/skills/vibe-postgres/SKILL.md`
   - `.agents/skills/vibe-age/SKILL.md`
4. Inspect the existing repository, Docker/dev environment and current migrations.

## Scope

Implement only the database foundation.

Do NOT implement:

- Graph API;
- Query IR;
- SDK;
- CLI;
- Graph Studio;
- MCP;
- GraphRAG;
- Cloud control plane;
- billing.

## Acceptance criteria

The implementation must prove:

- PostgreSQL starts successfully;
- AGE loads successfully;
- pgvector loads successfully;
- versions are pinned;
- Vibe database roles are separated;
- runtime paths do not require superuser privileges;
- a graph can be created;
- vertices and edges can be created;
- graph traversal works;
- a vector column can be created and queried;
- automated tests prove the above;
- security assumptions are documented.

## Evidence

Do not mark the stage VALIDATED based on configuration files alone. Run the database and tests.

Report:

1. What changed.
2. Files changed.
3. Commands executed.
4. Test results.
5. Architecture decisions discovered.
6. Security implications.
7. Problems/blockers.
8. Remaining UNKNOWN items.
9. Next stage.

Update the knowledge base only with facts supported by the evidence.
