# Stage 29 — Agent Evaluation & Observability

## Decision
Agent evaluation is a non-executing diagnostic boundary over canonical Agent Intent and Cross-Modal Plan artifacts. It reuses existing validation and explanation paths and never grants authorization, approval, execution or mutation authority.

## Safety contract
- Results expose only bounded case metadata and deterministic artifact hashes.
- Raw IR, credentials, bindings, tenant identity, query text, SQL/Cypher, embeddings and private catalog details are excluded from evaluation telemetry.
- Expected outcomes are limited to status, reason code and safety metadata.
- SDK, CLI, MCP and REST use the same evaluation contract.
- Evaluation metrics are bounded and use the existing observability sink.
