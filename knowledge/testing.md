# Testing

Status: VALIDATED through Stage 08 — Secure Execution Engine

## Stage 08 executable coverage

.github/workflows/stage-08-secure-execution.yml proves:

- Node PostgreSQL dependency installs;
- VibeDB builds and starts;
- Stage 02 tenant security fixture installs;
- validation failure produces zero DB calls;
- successful execution commits;
- execution failure rolls back;
- undeclared/missing parameters fail before BEGIN;
- rows are normalized;
- raw database error details are not exposed;
- real tenant-A execution through AGE remains isolated by PostgreSQL RLS;
- a query for tenant-B graph data returns no rows to tenant A.

## Security rule

The execution engine is the only intended route from validated Query IR to database execution.

## Merge blocker

Stages 01 through 08 have executable repository/CI evidence.
