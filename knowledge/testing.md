# Testing

Status: VALIDATED through Stage 05 — Vibe Query IR

## Core policy

Security tests are merge blockers.

No feature is VALIDATED without relevant executable evidence.

## Stage 05 executable coverage

.github/workflows/stage-05-query-ir.yml proves:

- the v1 JSON Schema is structurally valid;
- representative one-hop and two-hop fixtures conform to v1;
- unknown engine-specific fields such as Cypher are rejected;
- structured v1 errors conform to the error schema;
- engine-specific tokens are absent from valid fixtures;
- canonical serialization is deterministic;
- golden SHA-256 digests remain stable.

The reference test uses pinned jsonschema 4.23.0 when the runner does not already provide it.

## Merge blocker

Stages 01 through 05 have executable repository/CI evidence. Configuration-only claims are insufficient.
