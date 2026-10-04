# Stage 15 GraphRAG — Retrieval Contract

Status: IN_PROGRESS — retrieval IR foundation.

## Decision

GraphRAG uses an engine-neutral Retrieval IR v1 that composes two existing retrieval primitives:
- graph retrieval through canonical Query IR;
- vector retrieval through pgvector metadata referenced by the Schema Catalog.

The retrieval layer is not a new security boundary. It executes only inside the existing ExecutionContext → authorization → Schema Catalog → Secure Execution Engine → PostgreSQL/RLS path.

## Retrieval IR v1

A retrieval request contains:
- sources.vector with a Schema Catalog reference, parameter name and bounded top-k;
- sources.graph with canonical Query IR and a bounded candidate limit;
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

## Next executable gates

1. extend Schema Catalog with tenant-scoped vector metadata;
2. implement secure pgvector retrieval behind the existing execution context;
3. implement graph/vector hybrid execution and deterministic fusion;
4. add adversarial tenant isolation and cost-bound tests;
5. add agent/MCP retrieval exposure only after the data-plane contract is validated.
