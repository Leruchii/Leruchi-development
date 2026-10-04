# Stage 15 GraphRAG — Retrieval Contract

Status: IN_PROGRESS — hybrid data-plane validated; agent exposure pending.

## Decision

GraphRAG uses an engine-neutral Retrieval IR v1 that composes two existing retrieval primitives:
- graph retrieval through canonical Query IR;
- vector retrieval through pgvector metadata referenced by the Schema Catalog.

The retrieval layer is not a new security boundary. It executes only inside the existing ExecutionContext → authorization → Schema Catalog → Secure Execution Engine → PostgreSQL/RLS path. Graph and vector branches are normalized into a canonical candidate contract before fusion.

## Retrieval IR v1

A retrieval request contains:
- sources.vector with a Schema Catalog reference, parameter name, explicit identity_field and bounded top-k;
- sources.graph with canonical Query IR, explicit identity_field and a bounded candidate limit;
- fusion.strategy = weighted_rrf;
- bounded max_results and max_cost.

Tenant identity is deliberately absent. The authenticated ExecutionContext remains authoritative and is propagated to every underlying graph/vector operation.

## Security

- no raw SQL, Cypher, embedding column expressions, vector operators, or database fragments are accepted;
- vector source selection is a Schema Catalog reference, not an arbitrary table/column string;
- graph source is canonical Query IR, not a second traversal language;
- result/candidate/cost limits fail closed;
- PostgreSQL RLS remains authoritative for both relational/vector and graph data;
- retrieval metadata must be explainable without exposing raw document contents or hidden tenant data.

## Fusion

v1 uses weighted reciprocal-rank fusion as the engine-neutral composition rule. This keeps ranking semantics independent from pgvector/AGE implementation details and leaves room for later calibrated scoring without changing the security boundary.

## Validated data-plane evidence

- Schema Catalog exposes trusted vector physical metadata and tenant visibility.
- pgvector retrieval executes through transaction-local trusted claims and vector:read capability.
- Graph and vector retrieval execute through one canonical hybrid Retrieval IR.
- Candidate identity is explicit and normalized before weighted RRF fusion.
- Combined cost is checked before branch execution and vector execution receives the remaining budget.
- Real PostgreSQL + Apache AGE + pgvector CI proves tenant A receives A1/A2 and tenant B receives B1/B2, with no cross-tenant candidates.
- The Stage 15 data-plane gate passed in workflow run 37235543756.

## Next executable gates

1. expose retrieval through MCP only after preserving the same ExecutionContext, capability and no-tenant-payload rules;
2. add live MCP retrieval integration against the real GraphRAG data-plane;
3. prove MCP retrieval cannot bypass graph/vector capabilities or tenant isolation;
4. add retrieval audit/explainability metadata suitable for agent/tool responses;
5. then evaluate Stage 15 exit status against the complete GraphRAG gate.
