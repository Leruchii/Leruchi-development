# Stage 09 — Graph Mutations

Build only the write boundary described in BUILD_PLAN.md and BUILD_STATE.md.

Required:
- separate Mutation IR from Query IR;
- validate graph/label/edge/property/parameter shape against Schema Catalog;
- require trusted tenant context;
- compiler-owned tenant_id;
- graph:write for all writes and graph:delete for destructive operations;
- no raw Cypher/SQL fragments or value interpolation;
- execute in one transaction through the execution boundary;
- rollback on failure;
- document conflict semantics;
- adversarial cross-tenant tests.

Do not start SDK, CLI, Realtime, Studio, MCP, or GraphRAG.

A stage is not VALIDATED until executable tests and CI evidence exist.
