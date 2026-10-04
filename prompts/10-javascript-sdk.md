# Stage 10 — JavaScript SDK

Build only the public JavaScript client boundary described by BUILD_PLAN.md.

Required:
- expose Query IR v1 through an ergonomic builder;
- expose Mutation IR v1 through an ergonomic builder;
- do not expose AGE, Cypher, SQL or tenant identifiers;
- preserve typed parameter declarations and separate parameter values;
- enforce client-side identifier/limit/depth guardrails;
- provide injectable transport plus default HTTP transport;
- keep server-side authorization/catalog/RLS authoritative;
- add adversarial tests for engine leakage and unsafe identifiers.

Do not implement CLI, Realtime, Studio, MCP, GraphRAG or cloud work.

A stage is not VALIDATED until the SDK tests and CI pass.
