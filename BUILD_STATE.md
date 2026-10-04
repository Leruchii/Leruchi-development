# VibePlatform Build State

This file is the canonical handoff checkpoint for coding agents.

Agents must verify this state against Git history, implementation, tests, CI, and `BUILD_PLAN.md` before continuing. If evidence conflicts with this file, executable repository evidence wins and this file must be corrected.

## Current checkpoint

- Current stage: 14 — MCP Server
- Current status: IMPLEMENTED — NOT YET VALIDATED
- Last completed stage: 13 — Graph Studio
- Last validated commit: `0cf069de83457decfe4f9667e8d687a4be7c1328`
- Default branch: `main`
- Next implementation target: Finish Stage 14 destructive-operation approval, auditability, and capability issuance/revocation design; then Stage 15 GraphRAG

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

### Cross-agent IR handoff contract

The repository must make the IR boundary obvious to any coding agent without relying on conversation history. The canonical concepts are:

- Query IR v1 — engine-neutral read intent consumed by validation/planning/compiler/execution.
- Mutation IR v1 — engine-neutral write intent consumed by mutation validation/compiler/execution.
- Schema Catalog — authoritative metadata used to validate and compile both IRs.
- ExecutionContext — trusted tenant/role/capability context surrounding IR execution; tenant identity is never supplied by untrusted query or mutation payload fields.
- Secure Execution Engine — the only normal path from validated IR to PostgreSQL/AGE execution.

Before implementing a new API, MCP tool, SDK feature, Studio action, compiler feature, or agent capability, inspect the existing IR definitions/builders/validators and reuse them. Do not create a parallel representation merely because a new surface has different terminology.

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


### Stage 13 live composition gate added

The Stage 13 workflow now provisions the real PostgreSQL/AGE database, seeds the tenant isolation fixture, starts the Graph API against `vibe_runtime`, and exposes it to the Studio Playwright harness through `VIBE_API_URL`.

The live browser test signs in as `vibe_tenant_a`, goes through the Next.js Studio proxy, reaches the Graph API, executes Query IR through ExecutionContext and PostgreSQL/AGE/RLS, and asserts that Studio renders A1/A2 while B1/B2 are absent. This is distinct from mocked browser evidence.

Status: **VALIDATED — Stage 13 CI exit evidence is complete.**


## Stage 14 — MCP agent gateway started

Implemented the first agent-native MCP boundary:
- `packages/mcp-server/index.mjs` provides JSON-RPC MCP stdio handling.
- Current tools: `schema.discover`, `graph.query`, `graph.traverse`, `graph.mutate`.
- MCP never accepts tenant identity as tool input; the authenticated access token is the authority and the Graph API remains the security/execution boundary.
- MCP tools reuse the canonical Query/Mutation IR through the Graph API rather than creating an agent-specific query language.
- Free-form Cypher and arbitrary SQL are intentionally not exposed. `sql.query` and `execution.explain` remain gated on canonical relational execution/planning contracts.
- Added MCP contract tests and a Stage 14 CI gate.

Status: **Stage 14 STARTED — MCP CONTRACT IMPLEMENTED, INTEGRATION VALIDATION PENDING**.


Validation evidence: Stage 13 workflow run `37223423312` passed the full live Studio, renderer-browser, build and audit gate on commit `69842c6fa6dd43c5b44b3a96a962bed6aa177565`.

## Final Stage 13 / Stage 14 handoff

Stage 13 is now VALIDATED by the final active-branch CI evidence:
- live PostgreSQL/AGE database composition;
- authenticated tenant-scoped Schema Catalog through Graph API;
- Query IR → ExecutionContext → Secure Execution Engine → PostgreSQL/AGE/RLS → Studio;
- tenant A/B browser evidence;
- 360px responsive, keyboard and theme evidence;
- real SVG DOM renderer benchmark at 100/500/1,000 nodes;
- Typecheck, production build and Base UI audit.

A real defect discovered during this work was fixed: the Graph API did not expose the Schema Catalog endpoint required by the existing Studio proxy. The Graph API now authenticates the request and invokes the same tenant-scoped catalog provider used by execution.

A test-harness race was also fixed: mocked Studio browser tests now wait for the authenticated catalog fetch before triggering exploration.

Stage 14 MCP:
- MCP contract tests pass in CI.
- MCP tool schemas reject undeclared fields.
- MCP rejects caller-supplied tenant identity.
- MCP delegates Query/Mutation IR through the Graph API security boundary.
- Free-form Cypher and arbitrary SQL remain intentionally unavailable.

Current active PR: #30.
PR #29 was confirmed stale/unmerged; its missing browser renderer evidence was folded into PR #30 rather than treated as merged history.

Next exact action after PR #30 merges: begin the next canonical unfinished stage, Stage 14 integration hardening, with scoped AI/MCP capability issuance, revocation/audit semantics, and live Graph API integration evidence. Do not jump to cloud control-plane work.


## Stage 14 current checkpoint

Stage 14 is IN_PROGRESS.

Validated implementation now merged to main:
- PR #32: live MCP stdio → Graph API → PostgreSQL/AGE/RLS integration;
- PR #33: canonical capability vocabulary/route policy and request-ID propagation into ExecutionContext.

Current MCP tools:
- schema.discover
- graph.query
- graph.traverse
- graph.mutate

Security invariants:
- tenant identity is derived exclusively from the authenticated access token;
- tool schemas reject undeclared fields;
- Schema Catalog discovery requires graph:read;
- Query IR requires graph:read;
- graph mutations require graph:write;
- destructive mutations require graph:delete;
- MCP delegates execution to the existing Graph API and Secure Execution Engine;
- arbitrary SQL/free-form Cypher remain unavailable.

Remaining exit-gate work:
1. define scoped capability issuance and revocation without putting an auth control-plane implementation into the data plane;
2. define destructive-agent approval semantics (dry-run/impact/approval/audit) before allowing destructive MCP mutations;
3. add structured audit events with request ID, tenant, capability, tool, operation, graph and outcome while excluding secrets/raw query values;
4. update durable Stage 14 knowledge and final CI exit evidence.

Do not mark Stage 14 VALIDATED until those exit conditions have executable evidence.


## Stage 14 governance continuation — current handoff

Implemented on branch `stage14-agent-governance` after the Stage 14 MCP live-integration checkpoint.

Completed in this session:
- added a scoped capability-grant contract in `packages/capability-policy/grants.mjs`;
- defined `jti`, tenant, canonical capabilities, audience, expiry and optional scope requirements;
- defined external control-plane revocation lookup semantics without adding an authorization database to the data plane;
- added `packages/mutation-approval/index.mjs` for exact-mutation approval digests and tenant/expiry/control-plane verification;
- added mutation preview mode that validates and reports bounded impact without executing;
- destructive mutations now require an approval artifact in execute mode even when `graph:delete` is present;
- added `packages/audit/index.mjs` and a Graph API audit-sink boundary;
- audit events contain request ID, tenant, role, capabilities, route/tool, operation, graph, outcome, error code and approval ID only; secrets, JWTs and raw parameters are excluded;
- MCP `graph.mutate` now exposes explicit `preview`/`execute` modes and a closed approval artifact schema;
- Stage 14 CI now runs capability-grant, mutation-approval and audit contract tests.

Security/architecture decision:
- capability issuance and revocation remain control-plane responsibilities;
- the data plane validates scoped capability artifacts and may consult an injected revocation verifier, but does not mint, persist, or mutate authorization state;
- destructive agent actions require explicit, tenant-scoped, exact-mutation, time-bounded approval;
- MCP remains an adapter over the Graph API and canonical Mutation IR.

Not yet validated:
- branch CI has not yet run on this checkpoint;
- live MCP integration must be rerun with the new contracts;
- no Stage 14 VALIDATED claim is permitted until all gates pass.

Exact next action:
1. run Stage 14 CI through a pull request;
2. fix any executable failures;
3. merge only after all required checks pass;
4. update this checkpoint to VALIDATED only with CI evidence;
5. then begin Stage 15 GraphRAG on the same ExecutionContext/IR/security boundary.
