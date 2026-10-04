# VibePlatform Build State

This file is the canonical handoff checkpoint for coding agents.

Agents must verify this state against Git history, implementation, tests, CI, and `BUILD_PLAN.md` before continuing. If evidence conflicts with this file, executable repository evidence wins and this file must be corrected.

## Current checkpoint

- Current stage: 11 — CLI
- Current status: IN_PROGRESS
- Last completed stage: 10 — JavaScript SDK
- Last validated commit: `62366581a44183ed500a121ec3c9890d72ef21c5`
- Default branch: `main`
- Next implementation target: Run Stage 11 + Stage 04 revalidation CI, fix any failures, then merge only with green evidence

## Verified state

Stages 00 through 08 are validated by repository/CI evidence.

Stage 03 is the Supabase Compatibility Core:
- VALIDATED: Auth initialization, JWT verification, request-claim propagation, PostgREST access, RLS enforcement through PostgREST, tenant isolation.
- DEFERRED: Realtime to Stage 12, Storage until a concrete product requirement, Supavisor/pooling to infrastructure/cloud work when topology and connection requirements are known.

Stage 09 implementation passed unit, adversarial, and database-backed RLS mutation CI on the Stage 09 branch.

Stage 10 implementation passed focused JavaScript SDK CI:
- query builder tests passed;
- typed parameter binding tests passed;
- mutation builder tests passed;
- unsafe identifier/depth/result guardrail tests passed;
- engine-fragment rejection tests passed;
- HTTP transport bearer-token/path test passed;
- SDK module import passed.
- Stage 10 PR #12 was merged to main as `62366581a44183ed500a121ec3c9890d72ef21c5`.

Stage 11 implementation passed focused CLI CI:
- CLI parser tests passed;
- deterministic Schema Catalog type-generation tests passed;
- project configuration tests passed with token non-persistence;
- graph query delegation tests passed;
- unsafe identifier tests passed;
- CLI import passed.
Stage 11 PR #13 was merged as `278fef3679afc4d71834cfe0cb9bada5191bf81b`, but the stage exit gate is not yet satisfied because the repository has no established migration execution contract and remote Schema Catalog inspection has not been validated.

## Stage 09 objective

Implement safe graph create/update/delete through Vibe abstractions without bypassing the Secure Execution Engine or PostgreSQL RLS.

Required work:

1. Define Mutation IR v1 or an equivalent write-specific IR boundary without mixing unsafe engine fragments into read Query IR.
2. Support explicit mutation operations:
   - create vertex
   - create edge
   - update vertex
   - update edge
   - delete edge
   - delete vertex
3. Validate labels, edge types, endpoint compatibility, properties, identifiers, parameters, and mutation shape against the Schema Catalog.
4. Enforce trusted tenant context. Tenant identity must never be client-overridable.
5. Enforce write capabilities such as `graph:write` and any stronger capability required for destructive operations.
6. Compile mutations without raw client Cypher or SQL fragments and without interpolating untrusted values.
7. Execute mutations through the Secure Execution Engine using one transaction boundary with rollback on failure.
8. Decide and document mutation conflict/concurrency semantics before marking the stage VALIDATED.
9. Add auditable mutation metadata sufficient for later outbox/realtime integration without implementing Stage 12 prematurely.
10. Add adversarial cross-tenant mutation tests.

## Stage 09 security requirements

Security is a merge blocker.

Tests must prove at minimum:

- tenant A can create permitted graph data for tenant A;
- tenant A cannot create graph relationships that cross into tenant B;
- tenant A cannot update tenant B vertices or edges;
- tenant A cannot delete tenant B vertices or edges;
- tenant A cannot use mutation responses or errors to infer tenant B data;
- trusted tenant context cannot be overridden by mutation payload fields;
- raw Cypher/SQL injection paths do not exist in normal mutation APIs;
- failed mutations roll back atomically;
- PostgreSQL RLS remains authoritative.

## Stage 09 exit gate

Stage 09 may be marked `VALIDATED` only when:

- implementation exists;
- mutation IR/API contract is documented;
- authorization and validation are implemented;
- transactional execution is implemented;
- conflict semantics are explicitly decided;
- mutation and adversarial tenant-isolation tests pass;
- relevant CI passes;
- security implications are documented;
- knowledge files are updated;
- blockers and unknowns are explicit;
- the next stage is identified.

## Stage 10 implementation

Implemented:
- `packages/vibe-sdk/index.mjs`
- `packages/vibe-sdk/package.json`
- `packages/vibe-sdk/README.md`
- `tests/sdk/sdk.test.mjs`
- `.github/workflows/stage-10-javascript-sdk.yml`
- `prompts/10-javascript-sdk.md`
- `knowledge/decisions/stage-10-javascript-sdk.md`

The SDK exposes engine-neutral Query IR v1 and Mutation IR v1 builders, typed parameter binding, client-side guardrails, injectable transport, and a default authenticated HTTP transport.

The SDK does not claim server authorization, Schema Catalog validation, tenant assignment, compilation, RLS, or database execution. The default HTTP route names are a transport contract and require later Graph API/runtime validation.

## Stage 11 implementation

Implemented:
- `packages/vibe-cli/index.mjs`
- `packages/vibe-cli/package.json`
- `packages/vibe-cli/bin/vibe.mjs`
- `packages/vibe-cli/README.md`
- `tests/cli/cli.test.mjs`
- `.github/workflows/stage-11-cli.yml`

Validated within current scope:
- project base-URL configuration without token persistence;
- graph query/mutation delegation to the SDK;
- Schema Catalog type generation from catalog JSON;
- diagnostics endpoint command;
- local Docker Compose status command;
- parser and unsafe-input tests.

Remaining Stage 11 work before `VALIDATED`:
1. establish a safe migration file/execution contract;
2. implement and execute migration workflow using the repository's approved migrator role;
3. validate remote Schema Catalog inspection/type generation against an actual server contract;
4. add executable CI evidence for those workflows.

Do not start Stage 12 until these Stage 11 exit-gate items are resolved.

Do not backfill Realtime, Storage, or Supavisor merely to make Stage 03 broader. Their current deferral is intentional.

## Known unresolved decisions

The following remain open unless newer repository evidence resolves them:

- production Auth tenant-authorization claim issuance;
- shared runtime-role context propagation from PostgREST into the execution engine;
- planner/compiler selection beyond the current AGE path;
- recursive CTE fallback;
- vector index strategy;
- Realtime transport and authorization;
- Storage authorization/object isolation;
- Supavisor topology/security;
- scoped AI/MCP capability issuance, revocation, and audit;
- cloud topology, backups, RPO/RTO, billing, and metering.

## Agent handoff protocol

Every coding agent must begin by reading:

1. `AGENTS.md`
2. `BUILD_PLAN.md`
3. this file
4. relevant `knowledge/*.md`
5. relevant `.agents/skills/*/SKILL.md`
6. relevant `prompts/*`
7. recent Git history
8. relevant CI workflows and tests

Then:

1. verify the last completed stage against executable evidence;
2. inspect existing implementation before designing new abstractions;
3. continue the first unfinished canonical stage;
4. make the smallest architecture-consistent change;
5. run relevant tests, including security/adversarial tests;
6. update knowledge when facts or decisions change;
7. update this file before ending the work session. The root `BUILD_PLAN.md` remains the canonical architecture and stage-order source of truth.

If work stops mid-stage, this file must say exactly:

- what was implemented;
- what remains;
- what passed;
- what failed or was not run;
- what files/packages changed;
- current branch/commit or PR;
- blockers;
- the exact next action.

Never leave the next agent dependent on conversation history.

## Status vocabulary

Use these terms exactly:

- `READY_TO_BUILD` — previous stage validated; current stage not yet implemented.
- `IN_PROGRESS` — implementation has started but exit gate is not met.
- `IMPLEMENTED — NOT YET VALIDATED` — code exists but required executable evidence is incomplete.
- `BLOCKED` — safe progress cannot continue without resolving an explicit blocker.
- `VALIDATED` — exit gate is satisfied by executable evidence.

## Last handoff update

Stage 10 is validated and merged.

Stage 11 is in progress: migration execution, remote Schema Catalog inspection, tenant-private metadata isolation, and architecture regression automation are implemented and awaiting executable CI evidence.

CI evidence:
- Stage 10 workflow run `37195877514` — success.
- Stage 11 workflow run `37195984686` — success.
- Stage 11 PR #13 merged as `278fef3679afc4d71834cfe0cb9bada5191bf81b`.

Hardening work now in branch `hardening/catalog-tenancy-automation`:
- shared/tenant-owned graph catalog scopes with RLS;
- forced-RLS-safe migrator maintenance policy;
- numbered migration ledger and migrator-only CLI execution;
- authenticated remote Schema Catalog API and CLI inspection;
- tenant-private metadata adversarial tests;
- repository-wide architecture regression audit.

Stage 04 must be revalidated because its catalog security contract changed. Stage 11 remains unvalidated until both workflows pass in GitHub Actions.

Exact next action: run the branch CI, inspect failures automatically, fix them, then merge only after executable evidence satisfies the updated exit gates.
