# VibePlatform Build State

This file is the canonical handoff checkpoint for coding agents.

Agents must verify this state against Git history, implementation, tests, CI, and `BUILD_PLAN.md` before continuing. If evidence conflicts with this file, executable repository evidence wins and this file must be corrected.

## Current checkpoint

- Current stage: 12 — Graph Realtime
- Current status: READY_TO_BUILD (after PR #14 is merged to `main`)
- Last completed stage: 11 — CLI
- Last validated commit: `10d660138873377718cc2aca7c1e6aad75223c48` (head of PR #14, branch `stage-11-cli-validation`; Stage 11 CI run `37196737029`, all steps success)
- Default branch: `main`
- Next implementation target: merge PR #14, then start Stage 12 — Graph Realtime

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
Stage 11 PR #13 was merged as `278fef3679afc4d71834cfe0cb9bada5191bf81b` with the CLI core. The remaining exit-gate items were completed in PR #14 and are VALIDATED by CI (see "Stage 11 validation").

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

Implemented in PR #13:
- `packages/vibe-cli/index.mjs`, `bin/vibe.mjs`, `package.json`, `README.md`
- `tests/cli/cli.test.mjs`
- project base-URL configuration without token persistence;
- graph query/mutation delegation to the SDK;
- Schema Catalog type generation from catalog JSON;
- diagnostics endpoint command and local Docker Compose status command.

Implemented in PR #14 (completes the exit gate):
- `packages/vibe-cli/migrations.mjs` — migration execution contract (forward-only SQL files, `vibe_migrator`-only, per-migration transaction + advisory lock, SHA-256 checksum tracking in `vibe_meta.schema_migrations`, drift/out-of-order/missing-file refusal, rollback on failure, secret redaction);
- `packages/vibe-cli/catalog.mjs` — remote Schema Catalog contract client (`GET /rpc/vibe_schema_catalog`, v1 response validation, https/loopback-only bearer transport, no redirects, size/time limits);
- CLI commands `vibe migrate new|status|up|verify` and `vibe schema inspect|pull`;
- `migrations/0001_expose_schema_catalog.sql` — exposes catalog structure to `authenticated` through PostgREST;
- fix: the CLI binary now prints error messages (previously exited 1 silently);
- `tests/cli/migrations.test.mjs`, `tests/cli/catalog.test.mjs`, `tests/cli/migrations.integration.mjs`, `tests/cli/catalog-remote.integration.mjs`;
- extended `.github/workflows/stage-11-cli.yml` with a database-backed job;
- `knowledge/decisions/stage-11-cli.md` records both contracts.

## Stage 11 validation

Stage 11 is VALIDATED by executable evidence. Workflow run `37196737029` (commit `10d660138873377718cc2aca7c1e6aad75223c48`) succeeded for both jobs:

- `cli-tests`: CLI unit and adversarial tests (`tests/cli/*.test.mjs`) and CLI import.
- `cli-migrations-and-catalog` (real VibeDB Postgres image + PostgREST):
  - PostgREST started before migrations; the remote catalog endpoint was proven absent (not HTTP 200) beforehand;
  - database-backed migration tests passed: superuser and runtime-role connections refused; apply-once and idempotency; atomic rollback on failure; checksum drift, missing-file and out-of-order refusal; privilege-escalation attempts from a migration fail; concurrent runners apply each migration exactly once; tracking table unreadable by `vibe_runtime`;
  - the real CLI previewed, applied, re-applied and verified `migrations/`;
  - the CLI refused a superuser migration connection;
  - remote catalog contract tests passed against PostgREST: no token / anon / forged / expired JWTs refused; authenticated callers receive the v1 structure; `vibe schema pull` generated types; response contains structure only (no properties, policies or row data); structure is shared across tenants.
- Stages 01–10 workflows also passed on the same commit (no regression).

Local replication during development (PostgreSQL 16 without AGE, PostgREST 14.17): 26 CLI unit tests, 10 migration integration tests and 6 remote-catalog tests passed. CI used the repository's real database image.

The merge of PR #14 into `main` is required before Stage 12 starts. The separate GitHub "Code scanning AI findings" check on PR #14 failed during its own agent run ("Processing Request"); it is not one of the repository's workflows and reported no repository finding.

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
- per-tenant Schema Catalog visibility (catalog v1 structure is shared across tenants);
- whether remote catalog inspection moves behind the future Graph API instead of PostgREST;
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

Stage 11 is VALIDATED (PR #14, run `37196737029`). Stages 01–11 are validated.

What was implemented: migration execution contract and runner, remote Schema Catalog contract and client, `vibe migrate` and `vibe schema inspect|pull`, first migration, CLI error-output fix, tests, CI job, documentation.

What passed: all steps of both Stage 11 jobs and all Stage 01–10 workflows on commit `10d660138873377718cc2aca7c1e6aad75223c48`.

What was not run / known limits: raw CI logs were not retrievable from the assistant environment (blocked host), so evidence is workflow step conclusions; local replication used PostgreSQL 16 without AGE. Down migrations are intentionally unsupported. Realtime, Storage and Supavisor remain deferred.

Branch/PR: `stage-11-cli-validation`, PR #14 (open until merged).

Blockers: none.

Exact next action: review and merge PR #14, then start Stage 12 — Graph Realtime following `BUILD_PLAN.md`; the Stage 09 mutation audit metadata is the intended outbox input.
