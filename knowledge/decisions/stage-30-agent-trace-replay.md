# Stage 30 — Agent Trace & Replay

Status: VALIDATED — PR #59 merged after exact candidate head d6105f32338d82e76a8af1b5217228b0198516d02f passed 30/30 workflows.

Stage 30 adds a bounded diagnostic record for agent decisions and a non-executing replay path. It reuses Agent Intent and Cross-Modal Plan explanation logic; it does not create a new planner or execution engine.

## Trace contract

An Agent Trace v1 contains:
- trace ID and request ID;
- artifact kind;
- sanitized canonical artifact;
- deterministic artifact hash;
- bounded expected outcome;
- bounded observed outcome;
- optional sanitized case metadata.

Sensitive tenant identity, credentials, bound parameter values, embeddings, private engine fragments, and raw query strings are excluded.

## Replay contract

Replay accepts a validated trace and evaluates the sanitized artifact through the existing explanation path. Replay returns bounded expected/actual outcomes, mismatch fields, artifact hash and an explicit execution: not_executed marker.

Replay never executes SQL or Cypher, graph mutations, retrieval execution, grants capabilities, or changes tenant context.

## Regression contract

A replay result is a pass when all supplied expected outcome fields match the current explanation result. A collection of replay results is a regression when one or more results fail.

## Release implication

Trace/Replay is a reliability layer before autonomous execution. It must remain non-executing until its validation and historical regression gates are green.
