# Engine-Neutral Planner Decision

## Status

VALIDATED as the Stage 21 foundation and recursive fallback exit gate.

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

The implementation supports explicit capability registration and deterministic preferred-engine selection. Apache AGE remains the default preferred path. PostgreSQL recursive execution is a capability-gated fallback validated for the constrained supported Query IR subset.

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

Status: VALIDATED.

The first constrained PostgreSQL recursive compiler now exists in packages/compiler-postgresql-recursive. It consumes explicit relational mappings supplied by the Schema Catalog and emits parameterized recursive CTE SQL.

The compiler does not invent physical graph metadata, authorize requests, or execute SQL. It uses the existing transaction-local JWT claims for tenant identity and the existing JSON parameter-map binding convention.

Current evidence includes focused compiler tests and a database-backed Stage 21 workflow covering traversal, RLS isolation, depth, result limits and injection-safe parameter handling.

Exit evidence is complete: AGE-equivalent normalized results, authoritative Schema Catalog mapping, execution/planner integration, guardrail coverage and bounded planner observability all have executable evidence.


## Planner execution integration

The Graph API now resolves a compiler through the planner before read execution. Backward compatibility is preserved: Apache AGE is the only default registered engine. PostgreSQL recursive fallback is selectable only when a deployment explicitly registers the `postgresql-recursive` capability.

Planner telemetry records only bounded `engine` and `reason` labels. It does not emit tenant identifiers, query values, SQL, Cypher or parameters.

The Stage 21 database gate also compares the same logical two-hop traversal through Apache AGE and the PostgreSQL recursive compiler and requires equivalent normalized results before the stage can be validated.