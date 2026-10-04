# Build Prompt 01 — PostgreSQL + AGE + pgvector Spike

Use the VibePlatform AI Engineering Constitution,
the VibePlatform knowledge base,
and the vibe-postgres/vibe-age skills.

Execute Build Prompt 01:
PostgreSQL + AGE + pgvector Spike.

Before changing anything:

1. Inspect the repository.
2. Read AGENTS.md.
3. Read:
   - knowledge/architecture.md
   - knowledge/database.md
   - knowledge/security.md
4. Inspect the current Docker/dev environment.
5. Determine what already exists.

Then execute the requirements of Prompt 01.

Do not implement later roadmap stages.

Do not build the SDK, Graph Studio, MCP, GraphRAG, or cloud control plane.

The purpose of this task is to validate the database foundation.

Acceptance criteria must include:

- PostgreSQL starts successfully.
- AGE loads successfully.
- pgvector loads successfully.
- Vibe database roles are correctly separated.
- A graph can be created.
- Vertices and edges can be created.
- A vector column can be created and queried.
- Automated tests prove the above.
- Versions are pinned.
- Security assumptions are documented.

When finished, report:

1. What changed.
2. Files changed.
3. Tests executed.
4. Test results.
5. Architecture decisions discovered.
6. Problems encountered.
7. Anything that remains UNKNOWN.

Do not claim success unless you actually ran the relevant tests.
