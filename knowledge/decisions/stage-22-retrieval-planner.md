# Stage 22 — Retrieval-Aware Engine-Neutral Planner

## Status

VALIDATED.

## Decision

Extend the Stage 21 planner boundary to Retrieval IR without exposing physical engines to developers or agents.

Retrieval planning is source-aware:
- graph source → Apache AGE by default, or PostgreSQL recursive only when explicitly capability-registered;
- vector source → PostgreSQL/pgvector capability;
- hybrid source → a two-target plan, with deterministic weighted-RRF fusion remaining above the source engines.

The planner does not authorize, validate tenant identity, compile arbitrary input, or execute SQL. Retrieval validation, trusted ExecutionContext, Schema Catalog resolution, cost/result guardrails and Secure Execution Engine semantics remain authoritative.

## Why

Stage 15 already validated graph/vector hybrid retrieval, but Stage 21 initially planned only graph queries. Without a retrieval-aware planner, the architecture would have two subtly different engine-selection mechanisms. Stage 22 closes that gap while preserving the existing Retrieval IR and security boundary.

## Current implementation

- packages/planner/retrieval.mjs provides deterministic capability-driven retrieval planning.
- packages/retrieval-execution/index.mjs consumes the plan and selects the planned graph compiler.
- The internal planner selects source engines, but public retrieval metadata exposes only the engine-neutral mode; physical engine names are not returned to developers or agents. Public metadata does not expose tenant data, SQL, Cypher, embeddings or raw parameters.
- Focused tests cover vector, graph, hybrid, fallback and fail-closed planning.

## Exit evidence required

1. Stage 22 planner tests pass.
2. Retrieval execution tests prove planner selection occurs after Retrieval IR validation and before branch execution.
3. Vector, graph and hybrid plans are deterministic.
4. Missing/unavailable capabilities fail closed.
5. Recursive graph fallback is capability-gated.
6. Existing cost, depth, result, Schema Catalog, ExecutionContext and RLS controls remain authoritative.
7. Full repository regression matrix passes.


## Validation record

Stage 22 is validated on final candidate `6f094147821b1e2802884fe4bf879f24bb302741`.

- Stage 22 planner and retrieval-execution tests passed.
- Stage 15 live hybrid retrieval passed after the shared retrieval-plan initialization defect was fixed.
- The full repository matrix, Architecture Regression Audit and Stage State Gate passed.
- No second authorization or execution boundary was introduced.
