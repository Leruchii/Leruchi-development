# Engine-Neutral Planner Decision

## Status

VALIDATED as the Stage 21 foundation.

## Decision

Vibe Query IR remains the sole public read-query contract. Engine selection is introduced as a separate planner boundary between validation and compilation:

```
client / MCP / agent
        ↓
     Query IR
        ↓
 validation + guardrails
        ↓
      Planner
      ↙     ↘
 AGE compiler  PostgreSQL recursive compiler
        ↓          ↓
       Secure Execution Engine
```

The planner is capability-driven. It does not infer support from package presence and it never performs authorization, compilation or execution.

## Current scope

The first implementation supports explicit capability registration and deterministic preferred-engine selection. Apache AGE remains the default preferred path. PostgreSQL recursive execution is a declared fallback target, but it is **not** claimed as production-ready until a concrete compiler/data-model mapping and database-backed evidence exist.

## Why

This makes the bridge between SQL and graph a real architectural boundary instead of a future promise, while preventing an unsafe compiler fallback from silently becoming a production contract.

## Next evidence required

- map Schema Catalog graph metadata to a PostgreSQL recursive representation;
- compile a supported Query IR subset to recursive CTEs;
- prove tenant/RLS preservation;
- prove cost/depth/result guardrails survive fallback;
- prove normalized results match AGE for equivalent fixtures;
- add planner observability showing selected engine and fallback reason without exposing tenant data.


## Stage 21 recursive compiler progress

Status: IMPLEMENTED — NOT YET VALIDATED.

The first constrained PostgreSQL recursive compiler now exists in packages/compiler-postgresql-recursive. It consumes explicit relational mappings supplied by the Schema Catalog and emits parameterized recursive CTE SQL.

The compiler does not invent physical graph metadata, authorize requests, or execute SQL. It uses the existing transaction-local JWT claims for tenant identity and the existing JSON parameter-map binding convention.

Current evidence includes focused compiler tests and a database-backed Stage 21 workflow covering traversal, RLS isolation, depth, result limits and injection-safe parameter handling.

Remaining exit evidence includes AGE-equivalent normalized results, authoritative Schema Catalog mapping, execution/planner integration, full guardrail parity and planner observability.
