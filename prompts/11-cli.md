# Stage 11 — CLI

Continue only the unfinished CLI stage.

Required:
- project configuration without persisted secrets;
- schema inspection/type generation from an authoritative Schema Catalog;
- migration workflow using an approved migrator boundary;
- graph query/mutation commands delegated to @vibeplatform/sdk;
- diagnostics;
- local development workflow;
- no second compiler/security boundary;
- executable tests and CI.

Before implementing migrations or remote schema inspection, inspect existing database initialization, roles, Schema Catalog contracts, and repository conventions. Do not invent a privileged bypass.

Stage is VALIDATED only when all Stage 11 requirements have executable evidence and BUILD_STATE/knowledge are updated.
