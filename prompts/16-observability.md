# Stage 16 — Observability

Continue from the repository checkpoint rather than conversation history.

Read:
1. AGENTS.md
2. BUILD_PLAN.md
3. BUILD_STATE.md
4. knowledge/decisions/stage-16-observability.md
5. relevant execution-context, audit, Graph API and execution packages
6. recent Git history and Stage 16 CI

Objective:
Build operational visibility around existing request IDs, audit events, execution timings and GraphRAG retrieval metadata without leaking tenant data, secrets or raw database errors.

Required:
- structured logs;
- request/trace correlation;
- bounded metrics;
- database/query timing;
- mutation audit timing/signals;
- security-event visibility;
- executable redaction and integration tests;
- CI evidence.

Rules:
- reuse the existing ExecutionContext and audit contracts;
- PostgreSQL/RLS remains the security boundary;
- never log raw SQL, Cypher, request parameters, embeddings, bearer credentials or tenant-private payloads;
- do not create a second authorization boundary;
- do not introduce a hosted/cloud-only telemetry dependency into the OSS runtime;
- update BUILD_STATE before stopping.

Exit gate:
- all Stage 16 tests pass;
- architecture audit passes;
- telemetry redaction is adversarially covered;
- request and trace IDs correlate API, audit and telemetry events;
- query/mutation/retrieval timings are observable;
- security failures are visible through bounded event metadata;
- no secret/tenant-data leakage is present;
- BUILD_STATE and knowledge are updated with exact evidence.
