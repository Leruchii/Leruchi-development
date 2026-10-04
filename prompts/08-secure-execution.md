# Build Prompt 08 — Secure Execution Engine

## Mission

Create the central execution boundary that every future Graph API, SDK, REST and agent surface will use.

## Required reading

- AGENTS.md
- knowledge/architecture.md
- knowledge/security.md
- knowledge/testing.md
- knowledge/decisions/unknowns-and-contradictions.md
- .agents/skills/vibe-query-ir/SKILL.md
- .agents/skills/vibe-query-validation/SKILL.md
- .agents/skills/vibe-age-compiler/SKILL.md
- .agents/skills/vibe-secure-execution/SKILL.md

## Scope

Implement read-only graph execution for Query IR v1.

The engine must:

1. require trusted request context;
2. validate IR;
3. compile only after validation;
4. verify request parameter declarations;
5. begin a transaction on one database client;
6. execute the prepared AGE query;
7. commit on success;
8. rollback on failure;
9. normalize rows and errors.

## Security

- No direct compiler output execution outside the engine.
- No service_role unless validation allows trusted backend context.
- No raw database error messages in the public error object.
- No client tenant value overrides trusted context.
- RLS remains the final data boundary.

## Exit gate

Tests must prove:

- validation occurs before compilation;
- validation failure performs zero DB calls;
- successful execution commits;
- execution failure rolls back;
- undeclared/missing parameters fail before BEGIN;
- results are normalized;
- raw DB errors are normalized;
- real tenant A/B AGE execution remains isolated through PostgreSQL RLS.

Do not implement Graph API, SDK, CLI, Studio, MCP, GraphRAG or mutations.
