# Testing

Status: VALIDATED through Stage 17; Stage 20 production-readiness evidence is IN_PROGRESS.

## Validated coverage

Stages 01–17 have executable CI evidence covering:
- PostgreSQL/AGE/pgvector foundation and version contracts;
- adversarial tenant isolation and RLS;
- Query IR, validation, compiler and Secure Execution Engine;
- graph mutations and rollback;
- SDK and CLI contracts;
- realtime outbox/replay isolation;
- Graph Studio browser and live composition evidence;
- MCP scoped capabilities and tenant isolation;
- hybrid GraphRAG graph/vector retrieval;
- redaction-safe observability;
- backup/restore integrity and production-image AGE/pgvector recovery.

## Stage 20 readiness coverage

The production-readiness gate now covers:
- exact dependency/version policy;
- contiguous, fail-fast, timeout-bound migrator-only migrations;
- migration checksum recording and drift rejection;
- prior-schema-to-current upgrade preservation;
- idempotent migration reruns;
- bounded database pool policy;
- executable 32-request/4-connection concurrency evidence.

## Merge blocker

Security and correctness regressions remain merge blockers. A stage is not VALIDATED from static code presence alone; the relevant workflow must execute successfully and the evidence must be recorded in the canonical state/knowledge files.

## Remaining Stage 20 evidence

- final repository-wide regression matrix on the corrected head;
- durable incident/upgrade/dependency-update runbooks;
- capacity operating-envelope documentation based on measured CI evidence;
- reconciliation of all remaining UNKNOWN items without converting cloud-specific concerns into OSS guarantees.
