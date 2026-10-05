# VibeDB Context Resolution

Stage 26C resolves validated Context IR through existing trusted VibeDB execution boundaries.

## Contract

`Context IR + per-source parameters -> preflight -> existing secure executors -> bounded context result`

Context Resolution does not introduce a new query language, database executor, authorization path, tenant selector, or physical-engine API.

## Security invariants

- trusted ExecutionContext is required;
- all sources are preflighted before Schema Catalog or database access;
- tenant identity is never caller-supplied;
- query sources reuse Query IR validation, planner/compiler and Secure Execution;
- retrieval sources reuse Retrieval IR validation/planning/execution;
- vector retrieval requires `vector:read`;
- graph/schema/query context requires `graph:read`;
- unsupported source types fail closed before data-plane access;
- aggregate item and byte budgets are enforced;
- execution parameters live outside Context IR, matching existing Query/Retrieval envelope semantics.

`records` remains non-executable in v1 until a safe record-selection contract is defined.
