# Testing

Status: VALIDATED through Stage 20.

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

The production-readiness gate covers:
- exact dependency/version policy;
- contiguous, fail-fast, timeout-bound migrator-only migrations;
- migration checksum recording and drift rejection;
- prior-schema-to-current upgrade preservation;
- idempotent migration reruns;
- bounded database pool policy;
- executable 32-request/4-connection concurrency evidence;
- durable production-readiness operations/runbook documentation.

## Validation evidence

Corrected commit `139966a5a4a6a432d00a1924c967dabb969b3908` passed Stage 20 workflow `37297799623`, Stage 11 `37297799604`, Stage 12 `37297799687`, Stage 15 `37297799696`, Architecture Regression Audit `37297799715`, and Stage State Gate `37297799678`.

Security and correctness regressions remain merge blockers. A stage is not VALIDATED from static code presence alone; the relevant workflow must execute successfully and the evidence must be recorded in the canonical state/knowledge files.
