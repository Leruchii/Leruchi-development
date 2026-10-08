# Leruchi Build State

This file is the canonical handoff checkpoint for coding agents.

Agents must verify this state against Git history, implementation, tests, CI, and BUILD_PLAN.md before continuing. If evidence conflicts with this file, executable repository evidence wins and this file must be corrected.

## Current checkpoint

- Current stage: 32 — OSS Core Publication Preparation
- Current status: IN_PROGRESS — sanitized candidate built; exact-head full regression matrix still running.
- Last validated stage: 30 — Agent Trace & Replay.
- Stage 31 — Leruchi Core Readiness Gate: PR #62, head `1dffb521f48b49f2a2596ac808491e3356e57eaa`; its exact-head workflow matrix completed successfully. PR remains open pending the Stage 32 publication-preparation flow.
- Stage 32 PR: #63 — [Stage 32: Leruchi Core Publication Preparation](https://github.com/Leruchii/Leruchi-development/pull/63), draft and open.
- Stage 32 branch: `stage32-oss-publication-prep`.
- Current Stage 32 head: always resolve the live head from PR #63 before validating or merging; documentation updates themselves advance the branch head.
- Base main commit for PR #63: `48ef18d376e69686e5e5950dd508d4534da187b3`.
- Development repository: `Leruchii/Leruchi-development`.
- Internal control repository: `Leruchii/Leruchi-internal`.
- Public Leruchi repository: `Leruchii/Leruchi`.
- Runtime baseline: Node.js 24 only; Node.js 20 is prohibited.

Stage 31 exact-head evidence:
- Stage 31 workflow, architecture regression audit, stage-state gate, and full regression matrix completed successfully on PR #62 head `1dffb521f48b49f2a2596ac808491e3356e57eaa`.
- PR #62 remains open; do not claim it is merged.

Stage 32 candidate evidence:
- The Stage 32 candidate workflow succeeded on code head `3d7b3e1e00a7df89d07e46644c440f000bbaf812` before the checkpoint documentation update. Re-run the candidate and full regression matrix on the latest PR #63 head before merge.
- Candidate artifact: `leruchi-oss-core-candidate` (existing CI artifact identifier; do not treat “OSS Core” as the product name).
- Artifact SHA-256: `bcdeed870224290a70a3256ea9bf0b7e5ad06ff2ede13a8f0e4ae122da739851`.
- The first candidate run exposed a brittle realtime RLS source assertion that expected double quotes while the SQL correctly uses single quotes. The test now accepts either quote style; fix commit: `3d7b3e1e00a7df89d07e46644c440f000bbaf812`.
- The full Stage 32 exact-head regression matrix was still running on the pre-documentation code head; do not merge PR #63 until every required workflow is green on the live final head.
- The candidate workflow builds an artifact only. It does not publish or push the candidate into the public `Leruchii/Leruchi` repository.
- Public target inspection currently shows only a README, so publication remains a separate gated action.

Execution rules:
- Verify the latest branch head and all required workflow conclusions before merging.
- If any required workflow fails, inspect the failing job logs, fix the root cause, and rerun the exact-head matrix.
- After any fix that changes the head, revalidate the candidate artifact and all required checks on that new exact head.
- Update this checkpoint again before ending the build session.

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


## Stage 14 validation — completed

Stage 14 governance is now VALIDATED on main.

Validation evidence:
- PR #35 `feat: harden Stage 14 agent governance` merged as `b55d9b415086daa40bd999f1d66b479b71c41a6b`.
- Stage 14 MCP workflow run `37228039183` passed capability, MCP contract, capability-grant, mutation-approval/audit, database build/start, live MCP integration, cleanup, and architecture regression audit.
- Stage 09 mutation workflow run `37228039179` passed unit/adversarial and database-backed tenant-isolation mutation tests after destructive-operation approval was correctly added to the fixture.
- Stage State Gate and Architecture Regression Audit passed on the same checkpoint.

Stage 14 security contract now includes:
- control-plane-owned scoped capability issuance/revocation contract;
- tenant-scoped, exact-mutation, time-bounded destructive approval;
- preview mode with bounded impact metadata and no database transaction;
- structured audit events that exclude secrets, JWTs and raw query/parameter values;
- MCP tool attribution without creating a second execution/security boundary.

The Stage 14 exit gate is satisfied. Do not reopen Stage 14 unless new executable evidence contradicts these contracts.

## Stage 15 — GraphRAG in progress

The canonical retrieval contract, tenant-scoped vector catalog, and first secure pgvector execution path are now implemented behind the existing security boundary.

Current implementation:
- Retrieval IR v1 is engine-neutral, bounded, deterministic and rejects tenant overrides plus unsafe catalog/parameter identifiers.
- `0003-vector-catalog.sql` adds a tenant-scoped vector registry with RLS and trusted physical source metadata.
- Schema Catalog exposes only tenant-visible vector metadata.
- Secure vector execution resolves physical identifiers only from Schema Catalog metadata, uses parameterized pgvector operators, enforces vector dimensions and request budgets, and requires the canonical `vector:read` capability.
- Vector execution uses the existing transaction boundary and transaction-local PostgreSQL JWT claims; no second authorization boundary was introduced.
- Database-backed Stage 15 evidence now seeds tenant-private vector rows and proves tenant A cannot discover or execute against tenant B's registered vector source.
- Stage 15 CI includes Retrieval IR, capability policy, vector execution, architecture audit, and database-backed tenant-isolation gates.

Recent regression fixes:
- repaired the Stage 15 workflow's architecture-audit path;
- reconstructed the vector migration after CI exposed malformed SQL;
- the Stage 11/12 migration failures were traced to that same migration defect rather than unrelated stage regressions.

Next gate:
1. wait for and inspect the fresh CI runs from the repaired branch;
2. merge Stage 15 only after all relevant gates are green;
3. then implement deterministic hybrid graph/vector execution and weighted-RRF fusion;
4. only after hybrid data-plane validation expose retrieval through MCP.

Do not mark Stage 15 VALIDATED until those gates have executable evidence.


## Stage 15 — GraphRAG progress

The Stage 15 hybrid retrieval contract is now merged and CI-validated.

Implemented:
- explicit identity_field in vector and graph Retrieval IR sources;
- canonical retrieval result normalization in packages/retrieval-contract;
- deterministic weighted reciprocal-rank fusion using canonical candidates;
- explicit vector candidate identity projection through Schema Catalog metadata;
- secure hybrid orchestration in packages/retrieval-execution using the existing trusted ExecutionContext and execution boundaries;
- combined graph/vector cost preflight so over-budget retrieval is rejected before branch execution;
- adversarial contract tests for candidate identity, cost budgets, deterministic fusion and untrusted contexts;
- Stage 15 CI gate for hybrid retrieval execution.

Validation evidence:
- Stage 15 workflow run 37234787250 passed on the pre-merge implementation head.
- Architecture Regression Audit passed on the same validation cycle.
- The implementation was merged as 9ca0487ff7dbb8101eda10ec8b3c2e9db9b8c029.

Stage 15 exit gate passed:
- Real PostgreSQL + Apache AGE + pgvector hybrid integration passed in Stage 15 workflow run 37236216996.
- Tenant A/B retrieval returned only its own graph/vector candidates.
- Explicit candidate identity, combined budget enforcement and deterministic fusion were exercised against the real execution stack.
- A catalog-refresh defect was discovered and fixed: explicit vector registry metadata now reconciles with physical vector discovery instead of creating a duplicate Schema Catalog primary key.
- Live MCP GraphRAG retrieval passed for both tenants through the Graph API boundary.
- MCP tenant override rejection, source-specific capability enforcement and deterministic explanation metadata are covered by executable tests.
- Stage 15 is now VALIDATED and merged through PRs #39, #40 and #41.

Exact next action: begin Stage 16 Observability; preserve the existing security and IR boundaries while adding structured telemetry, timing, metrics and traces.


## Stage 16 — Observability handoff (validated)

Implementation started on branch stage16-observability in PR #42.

Implemented:
- packages/observability/index.mjs: redaction-safe structured telemetry, bounded metric names/labels, histogram observations, W3C traceparent parsing, generated trace/span IDs;
- Graph API request tracing, request/trace response headers, HTTP request metrics and bounded security-event metrics;
- audit events can carry trace ID and duration while preserving the prior shape when those fields are absent;
- graph query timing and database execution timing;
- mutation timing and database execution timing;
- hybrid GraphRAG retrieval timing;
- focused observability and Graph API telemetry tests;
- Stage 16 CI workflow and stage-specific knowledge/prompt.

Security invariants:
- telemetry hashes tenant identifiers;
- credentials, raw query text, SQL/Cypher, request parameters and embeddings are excluded from telemetry;
- metric names and labels are bounded;
- observability does not authorize, execute, or bypass PostgreSQL/RLS;
- existing audit and ExecutionContext boundaries remain authoritative.

Validation:
- Stage 16 workflow run 37237020122 passed on the earlier branch head before the final Graph API telemetry regression test was added.
- Architecture Regression Audit also passed on that earlier run.
- Final implementation head before this handoff update is ecb18a32b7af9024b712d0d426900b897506e00d; a fresh Stage 16 run is required before merge.
- Other repository workflows triggered by the PR are still running in the shared GitHub Actions queue; no failed conclusion has been observed for the final head yet.

Files/packages changed:
- packages/observability/index.mjs
- packages/audit/index.mjs
- packages/graph-api/index.mjs
- packages/execution-engine/index.mjs
- packages/mutation-execution/index.mjs
- packages/retrieval-execution/index.mjs
- tests/observability/observability.test.mjs
- tests/observability/graph-api-observability.test.mjs
- .github/workflows/stage-16-observability.yml
- knowledge/decisions/stage-16-observability.md
- prompts/16-observability.md

Exact next action:
1. Wait for the fresh Stage 16 workflow on the final head and inspect its job result.
2. If green, inspect the repository-wide required checks for failures; fix real regressions rather than ignoring them.
3. Merge PR #42 only after required checks are green.
4. Update BUILD_STATE on main to Stage 16 VALIDATED and Stage 17 READY_TO_BUILD.


## Stage 17 handoff

Stage 16 is merged to main. Repository-wide checks on the final Stage 16 head were green for the product test suites, including the dedicated observability gate, tenant isolation, query validation, retrieval, SDK, CLI and state checks. The GitHub Advanced Security `github-advanced-security` job failed in its external Processing Request step; it is not a Leruchi test or architecture regression and is not treated as a code failure.

Stage 17 is now READY_TO_BUILD.


## Stage 17 — Backup + Recovery validation

Stage 17 is VALIDATED on branch `stage17-backup-recovery` pending final PR merge.

Validated contract:
- PostgreSQL custom-format backups with SHA-256, byte-size, server/tool version, migration digest and measured timing metadata;
- restore integrity verification rejects checksum and byte-size mismatch before `pg_restore`;
- explicit `fresh` and `replace` restore modes;
- migration-ledger equality after restore;
- production-image recovery against PostgreSQL 17.11 + Apache AGE 1.7.0 + pgvector 0.8.7;
- restored real AGE graph data and pgvector-backed data;
- executable recovery-point boundary: pre-backup fixture data is restored and a post-backup committed write is absent;
- controlled CI benchmark evidence from Stage 17 workflow run `37289351363`: 232 ms production-image backup, 146 ms fresh restore.

Validation also discovered and fixed a clean-install defect: the database bootstrap attempted AGE grants before `ag_catalog` existed. AGE is now initialized before AGE-specific grants, and Stage 01 clean database foundation passed after the fix.

The measured timings are reference CI evidence only. Hosted backup cadence, retention, replication, regional recovery and numeric production RPO/RTO commitments belong to Stage 18 Vibe Cloud Control Plane.

Exact next action:
1. Run final-head repository checks after the documentation/state updates.
2. Merge PR #43 only if meaningful product/architecture checks are green.
3. On `main`, advance the canonical checkpoint to Stage 18 while keeping its private/deferred control-plane boundary explicit.


## Stage 20 — Production Readiness handoff

Implementation started on branch `stage20-production-readiness`.

Initial executable gate:
- `scripts/production-readiness-audit.mjs` enforces exact package dependency versions, versioned database extension/image contracts, contiguous migrations, fail-fast migration behavior, migration timeouts, migrator-role guards and migration-ledger identifiers;
- `tests/production-readiness/readiness-audit.test.mjs` contains adversarial policy tests plus a repository self-audit;
- `.github/workflows/stage-20-production-readiness.yml` runs the readiness audit, focused tests and architecture regression audit;
- `knowledge/decisions/stage-20-production-readiness.md` records existing evidence versus open production-readiness gates.

Audit findings at entry:
- operations/testing/unknowns knowledge is stale from earlier stages;
- no dedicated supported-schema upgrade drill exists yet;
- no explicit capacity/concurrency gate or reference operating envelope exists yet;
- incident/upgrade/dependency-update procedures still require durable documentation.

Stage 20 remains IN_PROGRESS. Do not mark it VALIDATED until those gaps are closed and the full repository regression matrix is green.


## Stage 21 — Engine-Neutral Planner foundation\n\nStatus: IN_PROGRESS.\n\nBranch: `stage21-engine-neutral-planner`.\n\nThe first planner boundary is implemented and unit-tested conceptually: Query IR remains engine-neutral, capability registration is explicit, Apache AGE is the preferred path, and PostgreSQL recursive execution is a declared fallback target only when a compatible compiler capability is registered. Production fallback evidence is still required.\n\n## Stage 20 — Production Readiness validation

Stage 20 is **VALIDATED**.

Validation evidence on commit `139966a5a4a6a432d00a1924c967dabb969b3908`:
- Stage 20 Production Readiness workflow `37297799623` passed.
- Stage 11 CLI workflow `37297799604` passed after migration checksum persistence was corrected.
- Stage 12 Graph Realtime workflow `37297799687` passed.
- Stage 15 GraphRAG workflow `37297799696` passed.
- Architecture Regression Audit `37297799715` passed.
- Stage State Gate `37297799678` passed.
- The Stage 20 upgrade drill proved supported prior-schema → current migration, checksum recording, checksum-drift rejection, preservation of prior data, and idempotent rerun.
- The Stage 20 concurrency smoke exercised 32 concurrent database tasks through a reference pool capped at 4 connections.
- Operations, testing, unknowns, and production-readiness runbook documentation were reconciled.

The checksum failure discovered during validation was a real migration-runner defect: psql `-v` variables were incorrectly relied upon inside a `-c` SQL string. The runner now uses strictly validated SQL literals for the checksum update, and the corrected full matrix passes.

Production boundary remains explicit: this validation does not claim universal capacity, hosted SLA, regional recovery, commercial RPO/RTO, billing, or cloud-control-plane guarantees. Stages 18 and 19 remain deferred.

## Stage 22 — Retrieval-Aware Engine-Neutral Planner

Status: IN_PROGRESS.

Implemented:
- deterministic Retrieval IR v1 planner for graph, vector and hybrid sources;
- explicit capability registration for Apache AGE, PostgreSQL recursive fallback and PostgreSQL/pgvector;
- retrieval execution consumes the planner before graph/vector branch execution;
- recursive graph compilation is selected only when explicitly capability-registered/preferred;
- normalized retrieval metadata reports only bounded source-engine/mode information;
- focused planner and retrieval-execution tests;
- Stage 22 CI gate;
- architecture and decision documentation.

Validation finding fixed:
- the initial Stage 22 head referenced the retrieval plan before initialization in packages/retrieval-execution/index.mjs;
- this was not isolated to the new tests: the same defect broke the existing Stage 15 live hybrid retrieval workflow;
- the corrected implementation initializes and validates the retrieval plan immediately after Retrieval IR validation, before any execution branch.

Exit gate evidence:
1. Stage 22 Retrieval Planner workflow `37314794551` passed;
2. Stage 15 GraphRAG workflow `37314794593` passed, including the live vector-database hybrid job;
3. all 21 repository workflows on final candidate `6f094147821b1e2802884fe4bf879f24bb302741` passed;
4. Architecture Regression Audit `37314794555` passed;
5. Stage State Gate `37314794572` passed;
6. the corrected shared retrieval execution path was exercised by both Stage 22 and Stage 15 tests;
7. documentation checkpoints were reconciled.


## Stage 23 — Unified Retrieval Developer/Agent Surface

**Status:** IN_PROGRESS.

Implemented on `stage23-unified-retrieval-surface`:
- SDK `client.retrieval()` builder for canonical Retrieval IR v1;
- SDK HTTP transport routing to `/v1/retrieval/query`;
- CLI `vibe retrieval query` delegation through the SDK;
- MCP Retrieval IR validation before transport;
- API retrieval capability-denial regression coverage;
- bounded retrieval telemetry corrected to report the planned mode;
- Stage 23 focused CI workflow;
- Stage 23 durable decision record.

Security/convergence invariants:
- developer SDK, CLI and MCP submit the same Retrieval IR shape;
- tenant identity remains trusted ExecutionContext/JWT state and cannot be supplied by retrieval input;
- graph/vector capabilities remain enforced at the API boundary;
- plan metadata remains bounded and does not expose tenant identifiers, catalog references, embeddings, raw parameters, SQL or Cypher.

Validation status:
- Stage 23 workflow run `37322100605` executed 35 focused tests: 34 passed; the only failure was CI setup because the workflow did not install the repository `pg` dependency before importing Graph API. The same run also exposed a malformed workflow-step encoding during the first CI correction pass; both CI defects were fixed without weakening product tests.
- A subsequent workflow trigger is queued on the corrected branch; full repository regression is also queued and must remain the merge gate.
- Stage 23 must remain IN_PROGRESS until focused CI, architecture/state gates and the final repository matrix are green.

Exact next action:
1. wait for and inspect the corrected Stage 23 focused workflow;
2. fix any product/test failure at the shared contract rather than weakening tests;
3. run/inspect the complete relevant regression matrix;
4. merge only after all required evidence passes;
5. update this checkpoint to VALIDATED with the exact final head and workflow evidence.


## Stage 23 — VALIDATED handoff

Stage 23 was merged to main in PR #48.

- Merge commit: `7ff5523dfa982632965cb7e46cede4f96cb4c834`
- Stage 23 focused workflow passed.
- Stage 22 Retrieval Planner passed.
- Stage 14 MCP passed.
- Stage 15 GraphRAG passed.
- Stage 16 Observability passed.
- Architecture Regression Audit passed.
- Stage State Gate passed.
- The repository regression matrix passed its required product/architecture workflows.

The separate Code Scanning AI review workflow failed because GitHub's Copilot code-scanning agent exceeded its monthly model quota. This was infrastructure/quota failure, not a Leruchi test, build, security, or product-code failure, and it was not used as a product validation signal.

## Stage 24 handoff

**Status:** READY_TO_DEFINE.

Next stage: Retrieval Explainability, Evaluation & Agent-Safety Boundary.

Exact next action:
1. define the bounded explain/evaluation contract over the existing Retrieval IR and planner;
2. add deterministic reason codes and agent-safe diagnostics;
3. add cross-surface golden fixtures and adversarial agent-safety tests;
4. connect observability correlation without recording sensitive retrieval payloads;
5. run the full regression matrix before validation.


## Stage 24 implementation handoff

Implemented on branch `stage24-retrieval-explainability-agent-safety`:
- non-executing retrieval explanation contract in `packages/retrieval-explainability/index.mjs`;
- authenticated Graph API `POST /v1/retrieval/explain` boundary;
- SDK `RetrievalBuilder.explain()` and transport routing;
- CLI `vibe retrieval explain --ir <file>`;
- MCP `retrieval.explain` closed tool;
- bounded deterministic reason codes and Retrieval IR hash;
- adversarial tests for capability denial, invalid input and metadata leakage;
- retrieval execution correlation event containing request ID, mode, planner decision and outcome without payload capture;
- Stage 24 focused workflow and durable decision record.

Validation is not yet complete. Do not mark Stage 24 VALIDATED until focused CI, relevant regressions, architecture/state gates and the final repository matrix pass.


## Stage 25 — VALIDATED

Stage 25 is validated on the exact implementation head before merge.

Validation evidence:
- Focused Stage 25 MCP Agent Tool Contract and Input Safety workflow `37340599434` passed.
- Full repository product/regression workflows for the exact Stage 25 head `8e72dee470e60f2c1a088397baa77d5d01120fc6` passed, including Stage 01–24 coverage where applicable.
- Architecture Regression Audit `37340599366` passed.
- Stage State Gate `37340599628` passed.

Validated contract:
- all MCP tools publish deterministic safety annotations;
- serialized agent arguments are bounded to 64 KiB and nesting depth to 20 before transport;
- annotations never grant authorization;
- tenant identity, capabilities, mutation approval and secure execution remain server-authoritative;
- no second authorization/execution path or physical-engine API was introduced.

PR #50 merged as `1cd6a9ab42e7c681fe7c134890b8e360efa819a3`. The Stage 25 merge is the durable main checkpoint.


## Stage 29 handoff

Implementation is in progress. Added bounded non-executing agent evaluation for Agent Intent and Cross-Modal Plan artifacts, with REST/SDK/MCP/CLI convergence and evaluation metrics. Focused CI and exact-head regression validation remain before merge.


## Stage 29 validation

Stage 29 merged as PR #58 at `93022678b151b1945640967ecc09642271c23e62`. Focused evaluation/observability CI, Stage State Gate, Architecture Regression Audit, and the historical regression workflows completed successfully on the candidate head. Evaluation remains non-executing and emits bounded metadata plus deterministic artifact hashes only.


## Stage 31A — Agent Governance Foundation

Status: IMPLEMENTED — NOT YET VALIDATED.

Added packages/agent-governance/ with engine-neutral Agent Governance v1 primitives for agent identity, explicit ownership, bounded capabilities, delegation, mandates, revocation and deterministic non-executing authorization decisions. Added focused tests and a decision record.

Security contract:
- governance records are not authentication proof;
- revocation and mandate expiry fail closed;
- capabilities and resource scope are bounded;
- authorization decisions never execute operations or grant capabilities;
- existing ExecutionContext, canonical IR validation, planner and Secure Execution Engine remain authoritative.

Deferred from this stage: DIDs/VCs, blockchain/immutable external ledgers, global reputation, hardware-rooted identity, regulatory/legal graph infrastructure and hosted Agent Passport products.

Validation status: not yet executed. GitHub Actions quota remains exhausted, so no CI rerun is claimed. Local executable validation is also not claimed because no local repository execution environment is available through the current GitHub connection.

Exact next action: validate the focused Agent Governance tests and architecture/security/OSS gates when executable CI capacity is available; then decide Stage 31 merge readiness.


## Stage 31A workflow integration

The Stage 31 OSS readiness workflow now watches `packages/agent-governance/**` and `tests/agent-governance/**` and runs the focused Agent Governance test file. This workflow change has not been executed because GitHub Actions capacity is exhausted.


## Node.js 24 baseline hardening

The Stage 31 branch standardized historical workflow runtime pins from Node.js 22 to Node.js 24 across the active repository workflows found during release-readiness audit. Node.js 24 remains the only supported project runtime. This change has not been executed in CI because GitHub Actions capacity is exhausted.


## Stage 31 validation progress — 2026-10-07

Status remains: IMPLEMENTED — NOT YET VALIDATED.

Validation work completed in this session:
- focused Agent Governance suite reconstructed from the exact branch files and executed in the available local runtime: 7/7 tests passed after two test-fixture defects were fixed;
- runtime-policy logic was hardened from a Node 20 blacklist to a positive Node 24-only contract;
- the runtime-policy script was exercised against positive Node 24 and negative Node 22 fixtures and behaved as expected;
- the OSS candidate audit was hardened to reject non-24 workflow/Docker/NODE_VERSION configuration and package engines outside >=24 <25;
- Stage 31 was reconciled with current main and canonical Leruchi identity; PR #62 now reports mergeable=true.

Important evidence limitation:
- the local container provides Node 22, not Node 24, so the local focused runs are supplemental evidence only and are not the release-runtime validation gate;
- GitHub Actions runs for the exact head are currently queued; no CI success is claimed until those Node 24 jobs actually execute and pass.

Current Stage 31 head: ae5f5efcb225863350537af727003ffae456ec60.

CI queue-control hardening: the Stage 31 workflow now uses GitHub Actions concurrency keyed by workflow plus PR/branch ref, with `cancel-in-progress: true`, so stale Stage 31 runs are automatically cancelled when a newer commit supersedes them. The sanitized candidate temp path was also normalized to `leruchi-oss-candidate`.

Exact next action: allow the new exact-head Node 24 workflow to execute under the now-public repository runner capacity, inspect failures if any, fix them, and only then mark Stage 31/31A validated and merge-ready.


## Stage 31 CI validation note

- The first Node 24 Stage 31 PR run reached GitHub Actions successfully on Node.js 24.21.0.
- Runtime policy passed and all OSS Core readiness tests passed (7/7).
- Agent Governance initially failed one test because the test identity lacked `vector:read`, causing the implementation's earlier `AGENT_CAPABILITY_DENIED` response before delegation-specific authorization. The test was corrected to include the required identity capability while preserving the delegation-specific denial assertion.
- Corrective commit: `5be5467eeb2dab6b82e6dec5bf2bc72385f29a32`.
- A new Stage 31 run is queued for that exact head; Stage 31 remains unvalidated until this run completes successfully.
- CI observation: PR updates currently fan out into roughly 30 workflow runs. Stage 31 has per-ref concurrency protection, but broader workflow concurrency hardening remains CI infrastructure follow-up work.


## Stage 31 follow-up workflow fixes

- Architecture Regression Audit failed on Node.js 24 because `tests/architecture/contract-audit.mjs` still referenced the renamed `infra/docker/postgres/init/01-vibe-bootstrap.sh`. The audit now targets `01-leruchi-bootstrap.sh`.
- Stage 31 OSS candidate readiness failed because its negative fixture intentionally used Node 22; the fixture now uses Node 23 so the test still proves non-24 rejection without retaining the deprecated Node 20/22 baseline.
- Architecture Regression Audit now uses `actions/checkout@v5` and `actions/setup-node@v6`, matching the current Node 24 policy, and has per-ref concurrency cancellation to reduce stale queue buildup.
- Stage 31 remains unvalidated until the new exact-head runs complete successfully.

## Stage 31 exact-head validation and rename regression cleanup

- Stage 31 readiness gate and Architecture Regression Audit passed on exact head `79a2b46db94a0c351087359e3b24b85d310b33c4`.
- Remaining failures on that validation set were traced to stale pre-Leruchi workflow/test contracts, not the Stage 31 OSS readiness gate itself.
- Repaired active workflow/runtime references from `packages/vibe-cli` to `packages/leruchi-cli`, migrated active public environment contracts from `VIBE_*` to `LERUCHI_*`, corrected the Stage 20 CLI executable path, and aligned MCP evaluation tests with the Leruchi MCP environment contract.
- Current remediation head is `4d8c9d9c92de8c5d626c93bdd7be675e3f1798bd`. The new exact-head workflow set is queued/pending and must complete before Stage 31 can be considered fully clean for merge/publication.
- Do not merge PR #62 or begin Stage 32 publication until the new exact-head workflow results are reviewed.

- Stage 15 GraphRAG hybrid integration env contract: corrected `tests/retrieval-execution/hybrid-integration.mjs` to use the canonical `LERUCHI_ADMIN_DATABASE_URL` and `LERUCHI_RUNTIME_DATABASE_URL` contracts. The previous exact-head failure was a stale `VIBE_*` test contract; the database build and prior vector-isolation proof passed.## Stage 31 final validation — 2026-10-08

Status: VALIDATED.

Exact validated code head: `69cca2565486d13ddd9d3ab029bdef6e0029d3ed` on PR #62.

Evidence from that exact code head:
- Stage 31 OSS Core Readiness: SUCCESS.
- Stage 31 Agent Governance coverage: SUCCESS.
- Architecture Regression Audit: SUCCESS.
- Stage State Gate: SUCCESS.
- Stage 15 GraphRAG: SUCCESS after correcting the stale `VIBE_*` test environment contract to canonical `LERUCHI_*` variables.
- All other required product/regression workflows associated with the exact code head completed successfully.
- PR #62 is open, non-draft, and currently mergeable.

The previous Stage 31/31A validation limitation is closed. No merge or public publication has occurred. Documentation changes in this checkpoint do not alter the validated product code. Stage 32 remains a separate controlled publication step and must use the sanitized OSS candidate/export allowlist rather than copying the private development repository wholesale.

## Stage 32 handoff — Leruchi Core Public Publication

Stage 31 is now the completed release-readiness gate. The next build step is to prepare and validate the controlled public publication candidate for `Leruchii/Leruchi`.

Required before publication:
1. verify the public export allowlist and forbidden-path/secret audit;
2. verify public repository contents and history policy;
3. build the sanitized candidate from the validated Stage 31 code head;
4. validate the candidate independently;
5. publish only after the candidate passes; do not expose private control/build material.

Do not merge PR #62 or publish the public repository automatically as part of this handoff; publication remains an explicit release action.


## Stage 32 ASVS verification update

- Stage 32 OSS publication PR remains draft and must not be merged yet.
- Stage 32 candidate workflow run 37637551479 failed at the initial ASVS verifier because the verifier matched its own private-key detection regex; no application-security finding was established.
- Corrected verifier commit: 2e6e176be94a855454e54ecbf9ab712c553257c7.
- Corrected ASVS 5.0.0 chapter applicability/profile commit: edc238aa15069026e56e530721a32325c6bbf28d.
- Corrected OSS export manifest identity text commit: e2edfbbba49ff215b538f8e63a5476b39ddaa48d.
- Latest profile-test head: 70599507a74b39431c17d0c3cce99519ff8c4d73.
- Latest Stage 32 candidate run for that exact head: 37638603708, currently queued; no pass claim yet.
- Official OWASP ASVS stable baseline remains 5.0.0. Requirement-level verification is still in progress; full compliance is not claimed.


## Superseding checkpoint — 2026-10-08, Stage 32 tenant/MCP security

This section supersedes older candidate-matrix notes above when they conflict.

- Stage 32 remains active. PR #63 is the primary Stage 32 PR and remains draft/open on branch `stage32-oss-publication-prep`; its live head must be resolved from GitHub before merge decisions.
- PR #64 is an isolated validation PR targeting the Stage 32 branch: https://github.com/Leruchii/Leruchi-development/pull/64. Validation branch: `stage32-tenant-claim-hook-validation`.
- Fully green security baseline: commit `d3b251ddee29e9d16a12a42fa0bbfc87d551962f`, 17 workflow successes and zero failures. Stage 03 proved actual self-hosted Supabase Auth-issued tenant claims and PostgREST tenant isolation.
- The next candidate code commit `f552e568ba57561599b7b1d7737ac5d180797ca2` updates the Graph API to enforce `graph:read` on graph queries, `graph:write` on mutations, and `graph:delete` on destructive deletes. It updates the tenant isolation test to expect HTTP 403 `CAPABILITY_DENIED` before query validation and pins Node.js 24 in Stage 02, Stage 06, Stage 07 and Stage 08 workflows.
- The previous candidate `6ed63d32f395ed30f1105bfa13d98cc7383ab575` had 26 successful workflow runs and one failure in Stage 02 due to the now-obsolete 400/validation assertion. Node.js 22 was observed in that workflow because it lacked explicit setup-node configuration.
- The f552 candidate has not run CI yet. Resolve the live validation branch head and inspect Stage 02, Stage 14, Stage 25 and the full exact-head matrix after the next run. Update this handoff and the internal `Leruchii/Leruchi-internal/BUILD_STATE.md` after results.
- Scoped capability grant issuance and revocation through a production control plane remain unimplemented. Do not claim that revocation is enforced without a live verifier.
- Runtime policy: Node.js 24 only; Node.js 20 and unpinned Node.js 22 runtimes are prohibited.
- Do not merge PR #63 or #64, and do not publish to the public repository, without release-gate completion and explicit approval.


## Pre-run checkpoint — signed capability grant integration candidate (2026-10-08)

Active Stage 32 validation branch prior to this candidate: d754c43aa666cf37cbfba8fe874411e5ff27add1. Its exact-head matrix completed with 30 successes and zero failures. Current next security gate is signed scoped capability grant validation with mandatory control-plane revocation.

Candidate adds:
- strict grant verification wired into Graph API authentication, including tenant/audience/expiry/canonical capability validation and mandatory jti revocation lookup;
- route/graph scope enforcement before catalog/database access;
- authenticated control-plane HTTP adapter with HTTPS enforcement off loopback and fail-closed handling;
- production launcher strict-mode configuration and a test-only CI control-plane stub;
- unit and Graph API tests for missing revocation service, revoked grants, unavailable control plane and scope denial.

This candidate is not yet on the validation branch and has not run CI. Do not claim the production control plane exists. Next: record the candidate SHA in internal handoff, advance only the isolated validation branch, inspect the exact-head matrix and update the handoff after results. No merge or public publication.


## Stage 13 workflow config fix candidate — 2026-10-08

The first strict-grant matrix had 29 successes and one Stage 13 failure. Log confirmed the launcher exited because Stage 13 did not set the required capability issuer/control-plane configuration. This is now corrected in the workflow by starting the test-only control-plane stub, waiting for readiness, and passing the same strict grant configuration used by Stage 14. The fix candidate is `2ae9de766bc31a9542c4e782170b0834857d69cb`; it has not run CI yet. The test stub is only a CI fixture, not a production control plane.


## Stage 13 browser grant fixture fix candidate — 2026-10-08

Candidate fixes the Playwright live-composition JWT to use the strict signed-grant contract: configured secret, test-control-plane issuer, unique jti, tenant_id, aud=leruchi, expiry and graph:read. Prior exact head b806511f854b33b125e04d6c787351813acf1fd5 had 29 successes and one Stage 13 browser timeout because this test token lacked grant claims. Candidate is not on the validation branch and has not run CI. Production control-plane deployment remains a release blocker.


## Pre-run checkpoint — asymmetric capability grant signatures, 2026-10-08

The prior exact head 57dd4815d7137945945c234f5d7ca9970e637bef passed 30 workflows. This next candidate replaces the production strict-grant HS256/shared-secret path with EdDSA verification using a key-id-selected public-key ring. The OSS data plane receives public keys only; private signing keys remain in the separate control plane. Required grant claims now include actor sub, jti, tenant_id, canonical capabilities, aud=leruchi and exp, with optional nbf and route/graph scope. Test-only Ed25519 keys are isolated under tests/fixtures; Stage 13 and Stage 14 workflows will use the public test key and a test-only revocation service. Candidate has not run CI. Re-read the internal handoff and record the exact new SHA before advancing the validation branch. Production control-plane issuance, private-key custody/rotation and operational revocation remain release gates.


## EdDSA CI key hygiene fix candidate — 2026-10-08

The first EdDSA candidate failed the Stage 32 ASVS gate because a PEM-formatted test private key was committed in a test fixture. The fix removes that static key and generates an ephemeral Ed25519 keypair in Stage 13/14 CI. The Graph API receives only the public DER key; browser/MCP test helpers read the ephemeral private-key file from /tmp. Unit tests generate an in-memory pair. This candidate has not run CI. The previous exact-head Stage 32 workflow failure is documented in the internal handoff; no pass claim until the next full matrix completes.


## Live revocation integration candidate — 2026-10-08

The next candidate adds a live MCP-to-Graph API test using a grant jti configured as revoked in the test control-plane stub. The test asserts the Graph API denies the grant through the HTTP revocation adapter. The production control plane is still not implemented/deployed in OSS; the stub validates only the interface contract. Candidate has not run CI.


## Self-hosted capability authority documentation candidate — 2026-10-08

Adds a public guide describing the external EdDSA grant issuer and revocation endpoint contract, strict-mode environment, key rotation, fail-closed behavior, membership-aware issuance obligations and deployment checklist. It explicitly states that the OSS runtime contains a verifier/adapter, not a production issuer, and that self-hosted/third-party authority is supported without Leruchi Cloud. The guide is eligible for export under docs/**. Candidate has not run CI.

## Stage 32 exact-head security and reproducible candidate validation — 2026-10-08

Status remains: IN_PROGRESS. The public release has not been approved or published.

Validated source head: `2bb4bad218a644748d50794da0b565a799b84166` on PR #64, based on Stage 32 branch head `07c76120856165c5a4dc98cb9aa223f20cbc8b06`.

Exact-head evidence:
- All 30 pull-request regression workflows completed successfully with zero failures.
- Stage 03 Supabase compatibility passed, including real Auth-issued access-token checks: active membership issued the expected tenant claim; a revoked tenant selector emitted no tenant claim; PostgREST RLS did not return cross-tenant rows.
- Architecture Regression Audit and Stage State Gate passed.
- Stage 32 candidate workflow run `37787015818` passed Node.js 24 runtime policy, the OWASP ASVS 5.0.0 verification profile, public export manifest checks, source export audit, candidate audit, packaging, and upload.
- Candidate contains 186 files and the candidate audit passed. The ASVS profile verification passed; do not claim full ASVS compliance.
- Two independent sanitized candidate builds produced byte-identical normalized archives. The archive uses stable path ordering, fixed file timestamps and ownership, and gzip without timestamp/name metadata.
- Candidate archive SHA-256: `b5c9979dbf85923a059f762f1abc6980ff378d10e5373d3c5b9ae5cfbabb175a`.
- GitHub Actions uploaded artifact digest (outer artifact ZIP): `f8d6c175901debf544602660dec8f63436a998e1066ffe91a7fef887a564103b`.
- The candidate builder preserves tracked file modes and rejects symlinks within the export boundary.
- The development database, Auth and PostgREST published ports are bound to loopback only; README documents that compatibility credentials are local development/CI only and must never be reused in production.
- Stage 32 candidate workflow uses `actions/upload-artifact@v6`; Node.js 24 remains the only supported project runtime.

Security/architecture boundaries:
- Tenant claims are resolved against private, active membership records; user metadata is only a selector, never authorization evidence.
- Missing/revoked membership fails closed; trusted tenant identity remains enforced by Graph API and database RLS.
- The OSS runtime provides signed capability-grant verification and a revocation adapter, not a production grant issuer or deployed production revocation control plane.
- Candidate workflow only builds and uploads an artifact. It does not publish to `Leruchii/Leruchi`.

Exact next actions:
1. Re-run the exact-head regression matrix after this checkpoint documentation commit; fix any failure without weakening tests.
2. If all required checks pass, integrate PR #64 into PR #63's Stage 32 branch (not into main and not into the public repository).
3. Re-run the candidate and full required regression matrix on the resulting exact PR #63 head.
4. Update this checkpoint with the final integrated head and evidence.
5. Present the sanitized candidate, checksum, exact CI evidence, remaining production limitations, and public-repository diff for explicit publication approval. Do not publish or merge the release PR without that approval.

