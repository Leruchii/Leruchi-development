# VibePlatform Build State

This file is the canonical handoff checkpoint for coding agents.

Agents must verify this state against Git history, implementation, tests, CI, and `BUILD_PLAN.md` before continuing. If evidence conflicts with this file, executable repository evidence wins and this file must be corrected.

## Current checkpoint

- Current stage: 13 — Graph Studio
- Current status: IN_PROGRESS
- Last completed stage: 12 — Graph Realtime
- Last validated commit: `6966240c82ef33619514f429953f368016964396`
- Default branch: `main`
- Next implementation target: Complete Stage 13 Graph Studio backend integration and renderer validation

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
Stage 11 PR #13 was merged as `278fef3679afc4d71834cfe0cb9bada5191bf81b`. The later catalog-tenancy hardening was merged in PR #15 as `b296635451e6bc24b4bb37ecbe9867ecaf920e98`. Stage 11 now has executable evidence for migrations, remote Schema Catalog inspection, tenant-private metadata isolation and architecture regression auditing.

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

Stage 11 exit gate is satisfied by the merged hardening work. Do not reopen Stage 11 unless new executable evidence contradicts the contract.

Do not backfill Realtime, Storage, or Supavisor merely to make Stage 03 broader. Their current deferral is intentional.

## Stage 12 implementation

Validated:
- durable tenant-scoped graph event outbox;
- commit-bound PostgreSQL NOTIFY wakeup;
- mutation executor outbox integration;
- tenant-scoped opaque subscription topics;
- relay claim/ack/retry primitives;
- adversarial tenant replay and RLS tests;
- relay-role NOBYPASSRLS proof.

The hosted transport remains adapter-pluggable; Supabase Realtime Broadcast is a production candidate, while the outbox/relay contract remains transport-neutral.

Validation evidence: Stage 12 follow-up workflow run `37210250276` passed realtime contract tests, fresh PostgreSQL/AGE migration execution, relay-role security, architecture audit, and database-backed outbox/NOTIFY/tenant-isolation integration, including the post-validation replay/topic hardening. The earlier PR #16 workflow was cancelled; its merge is not treated as validation evidence.

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

Stage 11 is validated: migration execution, remote Schema Catalog inspection, tenant-private metadata isolation, and architecture regression automation all have executable CI evidence. Stage 04 catalog tenancy hardening is also revalidated.

CI evidence:
- Stage 10 workflow run `37195877514` — success.
- Stage 11 workflow run `37195984686` — success.
- Stage 11 PR #13 merged as `278fef3679afc4d71834cfe0cb9bada5191bf81b`.
- Stage 12 PR #16 introduced the implementation and PR #18 merged the validation hardening as `d5a072cc83f6b6182c9d2e3e11c751d70885f472`.

Validated hardening now merged from `hardening/catalog-tenancy-automation`:
- shared/tenant-owned graph catalog scopes with RLS;
- forced-RLS-safe migrator maintenance policy;
- numbered migration ledger and migrator-only CLI execution;
- authenticated remote Schema Catalog API and CLI inspection;
- tenant-private metadata adversarial tests;
- repository-wide architecture regression audit.

Stage 04 was revalidated after the catalog security contract changed. Stage 11 passed its full exit gate.

Exact next action: continue Stage 13 Graph Studio with live Graph API/Schema Catalog integration and renderer benchmark evidence.


## Stage 13 implementation

In progress:
- Vibe UI design-system reference contracts restored;
- Next.js Graph Studio shell and first SVG canvas spike implemented;
- authenticated Next.js proxy routes for Schema Catalog and Graph API;
- tenant-scoped Schema Catalog provider with PostgreSQL request.jwt.claims binding;
- Graph Schema and Traversal Builder foundations;
- explicit loading/empty/error states;
- regression test preventing static demo data from appearing in the authenticated Explorer.

Correctness finding resolved:
- the prior Explorer fetched authenticated Graph API rows but rendered a hard-coded five-node demo graph instead of those rows;
- this could make different authenticated users appear to see identical graph data even when backend isolation was working;
- the Explorer now renders only authorized query results and shows an explicit empty state when no rows are returned.

Remaining before VALIDATED:
1. browser-level authenticated tenant A/B evidence;
2. responsive/accessibility browser evidence;
3. production graph renderer benchmark and decision;
4. complete end-to-end Graph API runtime composition against a live PostgreSQL/AGE environment.

Current branch: `main`
PR #24, PR #25, PR #27, and PR #28 are merged; their correctness, execution-context, and browser-evidence work is now part of main.
Latest implementation commits: `385244ca211f185a6fa663b92908951e9ffa1cc9` (AGE runtime RLS fix), preceded by `443e34dc817c1a9e993ddedc1b82dbe4b3fc7fc0`.
Validation status: IMPLEMENTED — NOT YET VALIDATED. PR #25 merged after the corrected security matrix passed. The first PR #25 matrix exposed a real runtime/RLS integration defect: the Graph API executes through the pooled `vibe_runtime` role, but the Stage 02 AGE test policies granted schema/table access only to tenant-specific roles. The runtime path therefore failed with PostgreSQL `permission denied for schema vibe_security` before the isolation proof could run.
The fix now grants `vibe_runtime` access to the test graph and adds separate FORCE RLS policies that derive the tenant from transaction-local `request.jwt.claims`, while preserving the direct `vibe_tenant_a`/`vibe_tenant_b` role policies.
The corrected PR #25 security matrix passed and PR #25 was merged as `5bd58b431f50c72745d4b7264d6e456d77bd2ed4`.
New runtime invariants:
- Graph API query execution binds verified JWT tenant/role/capabilities to PostgreSQL `request.jwt.claims` inside the same transaction used for execution;
- claim-binding failure rolls back before a pooled connection is released;
- mutation execution uses the same rollback-on-claim-binding-failure rule;
- malformed, unsupported, expired, or missing-tenant JWTs are classified as unauthorized;
- AGE `lt` compiles to strict `<`, with regression coverage for all comparison operators.
Exact next action: finish the Stage 13 renderer benchmark/production renderer decision and record the live Graph API → PostgreSQL/AGE runtime composition evidence. Browser tenant A/B, mobile-width, keyboard, and theme evidence now pass in CI. Stage 13 remains the canonical active stage until its exit gate is satisfied.


## ExecutionContext hardening continuation

Implemented on `stage14-execution-context-contract`:
- added `packages/execution-context/index.mjs` as the shared trusted execution-context contract;
- Graph API now creates the context directly from verified JWT claims and preserves request ID;
- Schema Catalog, query execution and mutation execution derive PostgreSQL `request.jwt.claims` from the shared context rather than duplicating claim-shaping logic;
- invalid/missing tenant context fails closed and Graph API classifies it as unauthorized;
- added focused execution-context regression tests.

Validation evidence: PR #27 merged as `d9526830c230f27bcfef311ae13e7d93e76e88f7`; secure execution, realtime, tenant isolation, Studio, catalog, compiler, mutation, audit, and state checks passed on the final PR head. GitHub Advanced Security failed only because its Copilot code-scanning service exceeded its monthly quota; this was infrastructure/quota failure, not a repository test failure. The shared context is now the mandatory boundary for Stage 13 runtime composition and Stage 14 MCP.


## Stage 13 browser evidence

Validated and merged in PR #28 as `6966240c82ef33619514f429953f368016964396`.
- Chromium browser tests prove tenant A and tenant B sessions render only their authenticated Graph API result sets.
- Mobile 360px coverage proves the Studio has no horizontal overflow and keeps graph nodes keyboard-focusable.
- Theme switching is exercised in-browser.
- The browser test suite initially exposed real mobile defects: horizontal overflow from the query controls and a mobile inspector overlay intercepting controls. Both were fixed before merge.

Remaining Stage 13 exit work:
- production renderer benchmark and explicit renderer decision;
- final live Graph API → PostgreSQL/AGE runtime composition evidence (the Stage 02 security E2E already proves the core JWT → Graph API → transaction-local claims → AGE/RLS path; Stage 13 needs the final composition evidence recorded against the Studio contract).
