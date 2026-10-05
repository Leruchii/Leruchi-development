# Stage 24 — Retrieval Explainability, Evaluation & Agent-Safety Boundary

## Decision

Stage 24 adds a bounded, engine-neutral diagnostic contract over the existing Retrieval IR and Stage 22 planner.

The diagnostic boundary is non-executing. It validates the canonical Retrieval IR, checks the authenticated capability boundary, invokes the same deterministic retrieval planner, and returns only safe mode/reason information. Retrieval execution remains exclusively in `packages/retrieval-execution`.

### Public diagnostic guarantees

The diagnostic result may expose:
- Retrieval IR validity;
- graph/vector/hybrid mode;
- deterministic reason codes;
- bounded request limits;
- a canonical Retrieval IR hash for correlation/evaluation;
- evaluation pass/fail checks.

It must not expose:
- SQL or Cypher;
- physical engine names;
- tenant identifiers;
- embeddings or raw parameters;
- credentials/tokens;
- unrestricted Schema Catalog internals;
- execution rows.

### Agent safety

MCP and developer surfaces must derive tenant authority from the authenticated execution context. Diagnostic input cannot add tenant identity, authorization, or a physical engine. A prompt/tool request can ask for an explanation, but it cannot grant itself capabilities.

### Evaluation

Golden fixtures compare the same canonical Retrieval IR across SDK, CLI and MCP. Evaluation is deterministic and bounded; it is not an LLM judge and cannot execute retrieval.

### Observability

Retrieval execution correlates the trusted request ID with the engine-neutral retrieval mode, planner decision and outcome through sanitized observability events. No request payload, tenant ID, embedding or physical engine is emitted.

## Explicit non-goals

- no LLM planner;
- no autonomous authorization;
- no second retrieval executor;
- no public physical-engine API;
- no new graph/vector database;
- no authorization encoded in model-generated text.
