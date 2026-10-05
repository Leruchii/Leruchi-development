# Stage 20 — Production Readiness

Status: IN_PROGRESS.

## Purpose

Stage 20 is the final OSS production-readiness gate. It does not reimplement earlier stages; it converts their evidence into a release-grade contract and closes operational gaps that were intentionally deferred while product boundaries were still moving.

Stages 18 (Vibe Cloud Control Plane) and 19 (Billing + Metering) remain deferred and private/product-specific. Their hosted concerns must not leak into the OSS runtime.

## Existing validated evidence

Already covered by executable repository evidence:
- security and cross-tenant isolation;
- trusted authorization/capability boundaries;
- secure query and mutation execution;
- GraphRAG and MCP tenant isolation;
- observability redaction, bounded metrics and traces;
- backup integrity, fresh/replace restore modes and AGE/pgvector recovery;
- migration ledger and forward migration runner;
- Graph Studio live tenant/render evidence.

Stage 20 must reuse these proofs rather than creating parallel boundaries.

## Gaps identified at Stage 20 entry

The initial audit found production-readiness work that is not yet fully evidenced:
- dependency/version policy was implicit rather than executable;
- upgrade strategy lacks a dedicated from-older-schema-to-current drill;
- capacity/concurrency behavior has no explicit gate or supported operating envelope;
- operations and testing knowledge are stale from the Stage 08 checkpoint;
- the unknowns ledger contains items resolved by later stages and must be reconciled;
- incident/operations readiness and release/upgrade documentation require a durable runbook.

## First executable gate

`scripts/production-readiness-audit.mjs` and its tests enforce:
- exact package dependency versions (local `file:` links are allowed);
- no floating `latest`, wildcard, caret or tilde dependency ranges;
- contiguous numbered migrations;
- every migration fails fast and declares lock/statement timeouts;
- every migration guards the `vibe_migrator` execution role;
- every migration contains its ledger identifier;
- the production database image uses versioned PostgreSQL/AGE and pgvector contracts.

This policy is intentionally narrow and deterministic. It is a foundation, not the full Stage 20 exit gate.

## Remaining exit work

Before Stage 20 can be VALIDATED:
1. add an executable upgrade/migration compatibility drill from a prior supported schema state to current;
2. add concurrency/capacity evidence for the database/API execution path and document the supported reference envelope;
3. reconcile operations/testing/unknowns documentation with Stages 09–17;
4. document incident, upgrade, rollback/recovery and dependency-update procedures;
5. run the full repository regression matrix and fix any real failures;
6. explicitly document any production claims that remain environment- or cloud-specific instead of inventing guarantees.
