# Leruchi Build State

This file is the canonical handoff checkpoint for coding agents.

Agents must verify this state against Git history, implementation, tests, CI, and `BUILD_PLAN.md` before continuing. If evidence conflicts with this file, executable repository evidence wins and this file must be corrected.

## Current checkpoint

**Verified 2026-10-10.** Current `main` includes documentation-only PR #85, merged as `e72e433fd2d025a32f05c8cba1ad98a909e6b633`; its post-merge matrix passed **26/26 checks**. The public export candidate source remains `bbdd9aa2265c952328f064cd7bbcd17a2a3bc1f5`; later handoff-document commits are excluded from the export. The Stage 32 candidate artifact and digests below remain the inspected candidate evidence. No versioned GitHub release has been published.

- **Development repository:** [`Leruchii/Leruchi-development`](https://github.com/Leruchii/Leruchi-development), default branch `main`, currently public.
- **Official public OSS destination:** [`Leruchii/Leruchi`](https://github.com/Leruchii/Leruchi), default branch `main`. Its README now identifies it as the intended public home for the approved source export; the repository currently contains the project landing page, not the Stage 32 source export, and has no versioned release.
- **Release boundary:** build and validate in `Leruchii-development`; publish only the allowlisted, reviewed export to `Leruchii/Leruchi`. Never mirror the entire engineering or internal/control repository into the public destination.
- **PR #83 — OSS export hardening:** merged as `4374e44ef4ee9214553d9863390eebe6cb430f53`. Added deterministic third-party dependency license inventory, export-contract enforcement, broader common credential-token pattern checks, Stage 31/32 verification and a fuller public README.
- **PR #84 — complete export-path CI coverage:** merged as `bbdd9aa2265c952328f064cd7bbcd17a2a3bc1f5`. Expanded Stage 31/32 path filters to cover all public-export paths and clarified that Supabase Compose credentials are local/test placeholders only. Exact-head matrix passed 22/22; post-merge matrix passed 26/26.
- **Candidate artifact:** Stage 32 run [37932619969](https://github.com/Leruchii/Leruchi-development/actions/runs/37932619969) produced artifact ID `11617171934` (`leruchi-oss-core-candidate`). GitHub artifact archive digest: `sha256:de51a538f153cbce2e9e3cf11cee60616f040662fde434565cf40bbab6c15aa9`. The contained candidate `.tar.gz` SHA-256 is `57d22c00e03c3d141580330551eb57824c15ed08968860ca3b93a5d957a77bab`. The Stage 32 synthetic merge tree and the squash-merged `main` tree were verified identical.
- **Artifact inspection:** 200 files; the initial automated scan found no forbidden control paths, common credential-token patterns, or Node.js 20 runtime configuration. This is automated evidence, not a substitute for manual source/license review.
- **Dependency licensing:** `THIRD_PARTY_NOTICES.md` inventories 138 dependency entries from the root and Studio npm lockfiles. LGPL-3.0-or-later, MPL-2.0 and CC-BY-4.0 license metadata are present and require explicit compatibility/attribution review before release. Inventory is metadata, not legal clearance.
- **PR #79 — strict capability grants and Studio integration:** merged at `cd40cb120f6772ebddc2a7edbb4be5c01fe75de4`; exact head passed 29/29 and post-merge matrix passed 26/26.
- **PR #81 — bootstrap compatibility/naming:** merged at `d0d7e8c0d43ec24924e5ce8950da092baeeaad2c`. `LERUCHI_*` variables are canonical with tested `VIBE_*` fallbacks; database name `vibedb` and established role/schema/migration identifiers remain unchanged.
- **PR #82 — Node.js 24 dependency baseline:** merged at `c8cb75f98cac543539b31a5fc899e4e0e791df70`. Node.js 24 is the only supported runtime; do not introduce Node.js 20 into product, CI, workflow, container or release configuration.
- **Stage 32 tracking PR #63:** remains draft/open as a tracking record only. It has a stale broad branch (380 commits/155 files); never merge it wholesale.
- **Stale identity PR #66:** closed as superseded by merged PRs #67, #69 and #81.
- **Branch protection:** Owner-managed follow-up. Per owner direction on 2026-10-10, automation must not change branch protection/rulesets and their configuration is not a blocker to publishing the OSS source export. Keep the operational risk visible; this checkpoint does not assert that `main` is protected.
- **Repository visibility:** development repository is public. Internal/control repository visibility could not be independently verified through the current connection. Per owner direction, visibility is owner-managed and not an automation blocker; do not change repository visibility.
- **Credential hygiene:** a GitHub credential was exposed in project context. Per owner direction, token rotation is owner-managed and not a publication blocker. Never repeat or reuse the exposed credential; automation must not attempt token rotation.
- **Production authorization:** capability-grant and revocation core is implemented/tested, but production authorization is not deployed. Real identity-provider/trusted-gateway integration, authoritative tenant policy, signing-key custody/rotation, least-privilege production DB roles, private networking/mTLS, monitoring/alerts and staging end-to-end/recovery evidence remain deployment gates.
- **Formal release gates still open:** owner/legal review of third-party LGPL/MPL/CC-BY license and attribution obligations; any required product-name/trademark review; and explicit owner approval for a versioned release. The candidate has undergone automated export/path/credential-pattern/runtime scans, but those bounded scans do not replace a human source and license review. Branch protection, repository visibility, and token rotation remain owner-managed follow-ups, not automation blockers. No versioned tag or GitHub Release exists yet.

### Required next actions

1. Owner/legal: review the exact candidate dependency tree and resolve any LGPL/MPL/CC-BY license, attribution, and distribution obligations; `THIRD_PARTY_NOTICES.md` is inventory evidence, not legal clearance.
2. Owner: decide whether any product-name/trademark review is required and record explicit approval for the first versioned engineering-preview release.
3. If any allowlisted/exported source file changes, rerun Stage 32 from the final source tree and retain exact-SHA and artifact-digest provenance.
4. After release gates are cleared, create a versioned Git tag and GitHub Release whose notes state engineering-preview status, Node.js 24-only runtime, and production limitations.
5. Separately, the owner may handle token rotation, repository visibility, and branch protection; do not block source publication on these settings or change them through automation.

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
- `packages/leruchi-sdk/index.mjs`
- `packages/leruchi-sdk/package.json`
- `packages/leruchi-sdk/README.md`
- `tests/sdk/sdk.test.mjs`
- `.github/workflows/stage-10-javascript-sdk.yml`
- `prompts/10-javascript-sdk.md`
- `knowledge/decisions/stage-10-javascript-sdk.md`

The SDK exposes engine-neutral Query IR v1 and Mutation IR v1 builders, typed parameter binding, client-side guardrails, injectable transport, and a default authenticated HTTP transport.

The SDK does not claim server authorization, Schema Catalog validation, tenant assignment, compilation, RLS, or database execution. The default HTTP route names are a transport contract and require later Graph API/runtime validation.

## Stage 11 implementation

Implemented:
- `packages/leruchi-cli/index.mjs`
- `packages/leruchi-cli/package.json`
- `packages/leruchi-cli/bin/leruchi.mjs`
- `packages/leruchi-cli/README.md`
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


## Stage 32 — OSS Core Publication Preparation

**Status: TECHNICAL CANDIDATE BUILT, CI-VALIDATED, AND EXPORT-REVIEWED.** The current source candidate is stable; do not merge PR #63 wholesale.

Verified 2026-10-10:
- Candidate source commit: `bbdd9aa2265c952328f064cd7bbcd17a2a3bc1f5`; candidate tree: `bf1d114aac1bab60b5f704f471d7b42d244e3c71`. Later handoff-document commits are excluded from the public export.
- PR #84 passed 22/22 exact-head checks; the post-merge matrix passed 26/26. Stage 32 run [37932619969](https://github.com/Leruchii/Leruchi-development/actions/runs/37932619969) passed all candidate steps and produced artifact [11617171934](https://github.com/Leruchii/Leruchi-development/actions/runs/37932619969), `leruchi-oss-core-candidate`.
- GitHub artifact archive digest: `sha256:de51a538f153cbce2e9e3cf11cee60616f040662fde434565cf40bbab6c15aa9`. Contained tarball SHA-256: `57d22c00e03c3d141580330551eb57824c15ed08968860ca3b93a5d957a77bab`.
- Inspected the exact archive: 200 files. The path scan found no excluded control paths, and targeted scans found zero matches for the configured common credential/private-key patterns or Node.js 20 runtime settings. The scan is not proof that every possible secret or defect is absent.
- Reviewed the export manifest, README, license inventory, contribution/security guidance, Node.js 24 declarations, root and Studio package metadata, public export audit, Stage 31/32 workflow gates, Compose defaults and database bootstrap. Compose credentials are local/test placeholders documented as such; do not reuse them outside local development.
- `THIRD_PARTY_NOTICES.md` inventories 138 dependency entries and 11 license expressions. LGPL-3.0-or-later, MPL-2.0 and CC-BY-4.0 entries remain flagged for any distribution/attribution review required by the owner; the inventory is not legal clearance.
- Node.js 24 remains the only supported runtime. The production authorization limitations in README remain true; passing CI does not mean production authorization is deployed.
- PR #63 remains an open tracking-only record with a stale 380-commit/155-file branch. Do not merge it wholesale.

### Owner-managed security follow-ups — separate from publication readiness

Per owner direction on 2026-10-10, token rotation, branch protection and repository-visibility settings remain owner-operated. Do not change them through automation, and do not treat them as blockers to completing or publishing the OSS source export. They remain important security/admin follow-ups for the owner to handle independently. The current connection cannot verify internal/control repository visibility or read main's protection settings.

### Remaining release considerations

1. Owner/legal review any license, attribution or product-name/trademark obligations deemed necessary for the intended distribution. This build record is not legal advice or legal clearance.
2. If any path covered by `OSS_EXPORT_MANIFEST.json` changes, rebuild Stage 32 and record fresh exact-SHA, tree and artifact-digest evidence.
3. Keep production deployment readiness separate from publishing source. Real identity-provider/trusted-gateway integration, authoritative tenant policy, signing-key custody/rotation, least-privilege DB roles, private networking/mTLS, monitoring/alerts and staging recovery evidence remain production gates.

The candidate's technical build and export checks are complete. Do not merge PR #63 wholesale; continue from current `main` and preserve the exact candidate SHA/digests above.


## Post-PR #88 checkpoint — 2026-10-10

**Development main:** `d1c02fae61120618cf9b39c5ff6f2e0605eb3dd8` (PR #88 merged).

### CI integrity gate and post-merge matrix

- PR #88 added `.github/workflows/ci-root-integrity.yml`: Node.js 24 policy, root `package.json`/lockfile consistency, clean locked dependency installation, runtime-policy audit, tracked JSON parsing and tracked shell syntax checks.
- The PR's exact-head checks passed before merge.
- Post-merge matrix for the merge commit completed: 23 workflow runs, all 23 concluded `success`, including Stage 13 Graph Studio, Architecture Regression Audit, Stage State Gate, and dynamic CodeQL.
- This verifies the workflows triggered for that commit; it does not claim production deployment readiness.

### OSS candidate preservation

- Stage 32 candidate source remains `bbdd9aa2265c952328f064cd7bbcd17a2a3bc1f5`, with the previously recorded candidate artifact digest and tarball SHA above.
- PR #88 changed only the CI integrity workflow, which is explicitly excluded from the public export manifest. The Stage 32 candidate inputs and recorded artifact are therefore unchanged by PR #88.
- Keep Stage 32 as the publication gate. If any export-eligible path or a candidate-builder/audit input changes, rebuild and record new exact-SHA, tree, and artifact-digest evidence.
- Do not merge stale PR #63 wholesale. Public repository and public PR #4 remain untouched; publication is a separate owner-controlled action.

### Secret-scanning follow-up — unresolved, do not suppress blindly

- No exact Gitleaks fingerprints for the previously reported historical `VAULT_ENC_KEY` findings are recorded in this checkpoint. Do not add broad ignores or fabricate fingerprints.
- Before any ignore is considered, retrieve the scanner's exact findings and confirm whether each value is a harmless committed placeholder or a live/previously live credential. Rotate any real credential and remove it from active use.
- The GitHub credential previously pasted into the project conversation must be revoked/rotated by the owner. Do not reuse or copy it into source, workflow files, issues, or logs.
- The current development workflow list does not contain a dedicated Gitleaks workflow. A scanner should be added only with a deliberate policy for blocking new findings and handling verified historical placeholders—without disabling other security checks.

### Owner-managed release/admin boundaries

- Node.js 24 remains the only supported runtime.
- Repository visibility and branch-protection settings remain owner-managed; this connection did not verify or change them.
- License and attribution review remains a separate owner/legal responsibility. A green build is not legal clearance or proof of production readiness.
