# Stage 23 — Unified Retrieval Developer/Agent Surface

## Status

IN_PROGRESS.

## Decision

Expose one engine-neutral Retrieval IR contract to developers and AI agents through the existing SDK, CLI, Graph API and MCP surfaces.

The public flow is:

    Developer SDK / CLI
              \
               → Retrieval IR v1 → validation → capability check → planner → secure execution
              /
    MCP / agent

No surface may expose Apache AGE, Cypher, PostgreSQL recursive SQL, pgvector internals, tenant identifiers, embeddings in plan metadata, or internal credentials as part of the retrieval contract.

## Implementation

- packages/vibe-sdk/retrieval.mjs provides a bounded Retrieval IR builder.
- packages/vibe-sdk/index.mjs exposes client.retrieval() and routes retrieval requests to /v1/retrieval/query.
- packages/vibe-cli/index.mjs exposes vibe retrieval query while delegating construction and transport to the SDK.
- packages/mcp-server/index.mjs validates Retrieval IR before forwarding retrieval.query to the same Graph API route.
- packages/graph-api/index.mjs already owns the authenticated retrieval endpoint and capability checks; Stage 23 preserves that boundary.
- Retrieval execution continues to consume the Stage 22 planner and exposes only bounded plan mode/engine metadata.
- Retrieval telemetry now records the planned mode (graph, vector, or hybrid) instead of hard-coding hybrid.

## Security and convergence requirements

- Tenant identity is derived only from trusted ExecutionContext/JWT claims.
- Graph retrieval requires graph:read; vector retrieval requires vector:read.
- MCP rejects tenant fields before transport and validates Retrieval IR locally.
- SDK and CLI reject unsafe identifiers/catalog references before transport.
- Server-side Retrieval IR validation remains authoritative.
- Developer and MCP surfaces submit the same Retrieval IR shape to /v1/retrieval/query.
- Plan metadata is bounded to mode, selected engine, fusion configuration and result/cost bounds. It must not include tenant IDs, catalog references, embeddings, raw parameters, SQL or Cypher.

## Validation gate

Stage 23 is not VALIDATED until:

1. SDK retrieval builder tests pass.
2. SDK HTTP transport reaches /v1/retrieval/query.
3. CLI retrieval tests prove delegation to the SDK.
4. MCP retrieval validation/security tests pass.
5. API capability-denial tests pass.
6. Retrieval execution telemetry remains bounded and correctly labels mode.
7. Relevant live MCP/GraphRAG retrieval evidence remains green.
8. Architecture Regression Audit and Stage State Gate pass.
9. The complete repository regression matrix for the candidate head passes.
10. BUILD_STATE.md records the final evidence and exact next action.

## Non-goals

- No new database or retrieval engine.
- No second authorization path.
- No new agent-only retrieval language.
- No LLM planner or probabilistic routing.
- No unrestricted explain endpoint.
