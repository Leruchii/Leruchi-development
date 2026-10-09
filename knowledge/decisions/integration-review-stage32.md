# Stage 32 Integration Review

Status: RISK-BASED REVIEW PLAN RECORDED — DO NOT MERGE THE CANDIDATE WHOLESALE; security slice ported to PR #68 for separate review

Review date: 2026-10-09
Base: `main` at the currently verified repository checkpoint
Candidate: `stage32-oss-publication-prep`

## Current comparison

The live compare is the source of truth. Current candidate head `8c99e49b773b6af806ef1781788408be94871061` is 378 commits ahead and 0 behind, with 155 changed files, 6,317 additions and 606 deletions. The changed-file inventory spans CI, runtime configuration, tenant/security boundaries, package renames, product capabilities, export tooling, security evidence, and release documentation. This is a cross-cutting integration, not a single-stage release change. The older `0de25d9d3c9694cd6711fd57286c934ef926290f` snapshot below is historical only.

A passing workflow matrix establishes that checked workflows passed for a particular SHA; it does not prove the entire diff is semantically safe, that every changed path was reviewed, or that the whole branch is an appropriate merge unit.

## Change groups and review risk

| Group | Representative paths | Review risk / required evidence |
|---|---|---|
| CI/runtime policy | `.github/workflows/*.yml`, `scripts/assert-runtime-policy.mjs`, `.nvmrc`, package engines | Verify Node.js 24 is the only supported runtime, workflow actions and permissions are least-privilege, triggers/concurrency are correct, and no workflow bypasses tests. |
| Database/tenant boundary | `docker-compose.yml`, `infra/docker/postgres/**`, `infra/supabase/**`, Stage 01–03 workflows and security tests | Review SQL privilege boundaries, RLS, trusted tenant-claim derivation, service credentials, local-only test secrets, and real Auth-to-PostgREST isolation evidence. |
| Core API/security | `packages/graph-api/**`, `packages/capability-policy/**`, schema catalog and execution boundary | Review all authorization paths, deny-by-default behavior, capability-to-route mapping, tenant binding, revocation outages, key rotation, and malformed token behavior. |
| Developer and agent surfaces | `packages/leruchi-cli/**`, `packages/leruchi-sdk/**`, `packages/mcp-server/**`, agent governance/intent/context packages | Verify renames preserve behavior and entry points; MCP/SDK/CLI must not create alternate authorization or execution paths. Check package exports, migration guidance and backwards-compatibility policy. |
| Product naming and compatibility | README, Studio metadata, CLI/SDK paths, Docker bootstrap/backup scripts, tests and workflow labels | Treat rename changes as a controlled migration, not blind replacement. Check commands, image names, env vars, docs, URLs, telemetry, examples and old-name migration paths. |
| OSS boundary/export | `OSS_EXPORT_MANIFEST.json`, `scripts/build-oss-core-candidate.mjs`, `scripts/public-oss-export-audit.mjs`, LICENSE, Stage 31/32 workflows | Independently inspect the exact SHA artifact, manifest allowlist, file inventory, license attribution, secrets and private/internal-only paths. |
| Security verification evidence | `security/owasp-asvs-5.0.0-*.json`, verification script and tests | Verify each evidence item is backed by an executable test or an explicit documented gap. A profile/evidence file is not a certification or proof of full ASVS compliance. |
| Build/state docs | `BUILD_STATE.md`, `BUILD_PLAN.md`, `knowledge/decisions/**` | Reconcile historical checkpoints so stale SHAs and CI runs are clearly marked historical; every validated claim must name its exact source SHA. |

## Integration strategy

Do not merge the 378-commit branch as one indivisible PR. Use the candidate as a source of changes and port reviewed, dependency-ordered slices onto a clean branch from current `main`:

1. **Baseline and runtime foundation:** reconcile current main vs candidate, preserve Node.js 24-only policy, update CI action/runtime changes, and validate all existing main workflows.
2. **Tenant and security boundary:** port database role/RLS/tenant-claim changes and capability verification as one reviewable security slice. Require negative tests for forged claims, cross-tenant reads/writes, missing capabilities, revoked/expired grants and control-plane outage.
3. **Developer/agent surface changes:** port CLI/SDK/MCP/package renames and the related tests together; preserve one execution and authorization boundary.
4. **New agent-governance/trace and other feature deltas:** include only features confirmed not already on main, each with focused contracts, tests and docs.
5. **OSS packaging/release gate:** port export manifest, license, audit scripts, release workflows and docs last, after the intended source set is stable. Rebuild and inspect the artifact from the final integrated SHA.

For each slice: record the exact base/head SHAs; review every changed file; run focused tests, affected historical stage workflows, Architecture Regression Audit and Stage State Gate; resolve failures rather than weakening assertions; and merge only the slice whose diff and checks were reviewed. Re-run dependent workflows after each merge. Do not use a green result from the current candidate as proof for a different integrated SHA.

## Open blockers

- Repository visibility is left to the owner, as requested. Verify visibility before integration.
- Formal product-name clearance remains a release blocker.
- Production grant issuance and persistent revocation authority require implementation, deployment, key/identity configuration and operational validation. The current test stub is not a production service.
- Public OSS publication remains separately gated and requires explicit approval.
- Product owner has confirmed the canonical product name is **Leruchi**. Rename PR [#67](https://github.com/Leruchii/Leruchi-development/pull/67) normalizes active product-facing names; it is not a legal trademark-clearance opinion.
- The strict capability authorization slice has been ported to clean-main draft PR [#68](https://github.com/Leruchii/Leruchi-development/pull/68). It is not merged; require exact-head CI and security review before considering it integrated.

## Decision

**No wholesale merge.** Use a clean main-based integration branch and port reviewed slices in the order above. This document is a risk-based grouping and integration plan; it is not a claim that every line in the 155-file diff has already received semantic review.


## Security follow-up status — candidate vs clean-main PR

A security review identified revocation-response semantics that must not be accepted merely because a workflow matrix is green:

- The candidate branch's older control-plane implementation returned `active: true` after revocation and defined activity only as `not expired`. That is semantically incorrect for an effective authorization decision.
- Clean-main PR [#68](https://github.com/Leruchii/Leruchi-development/pull/68), head `9d79f25a4b84afe82a1a96d50785d22524e9757f`, corrects the contract: a revoked or expired grant returns `active: false`; unknown grants fail closed; the internal bearer check is timing-safe; and the regression test asserts the post-revocation response.
- PR #68 also adds strict EdDSA grant verification, rejects grant-shaped tokens on the legacy HS256 path, checks route/graph scope, and makes unavailable or malformed revocation decisions fail closed.
- PR #68 has **35/35 commit checks successful** on that exact SHA. These results validate PR #68's head only; they do not automatically validate the older implementation on PR #63. Port/reconcile the reviewed security slice after the Node.js 24 baseline, then rerun all dependent checks on the resulting integrated SHA.

## Current dependency-ordered integration checkpoint — 2026-10-09

All three clean-main implementation PRs are open drafts and independently green on their recorded heads:

- **Runtime baseline first:** PR [#69 — Enforce Node.js 24 across CI workflows](https://github.com/Leruchii/Leruchi-development/pull/69), head `7cc5104f07719e82131018a38513b303f79f10a0`, **31/31 commit checks successful**.
- **Canonical product identity second:** PR [#67 — Make Leruchi canonical across active product surfaces](https://github.com/Leruchii/Leruchi-development/pull/67), head `646ee91fd09fe81e2d5187dc2476a42ada7f1c77`, **32/32 workflow runs and 37/37 commit checks successful**. Its Leruchi brand audit passed. Compatibility-sensitive `VIBE_*`, `.vibe/`, database identifiers and `aud=vibedb` remain intentionally tracked for tested migration rather than blind replacement.
- **Strict authorization third:** PR [#68 — Integrate strict capability grants and control-plane service](https://github.com/Leruchii/Leruchi-development/pull/68), head `9d79f25a4b84afe82a1a96d50785d22524e9757f`, **35/35 commit checks successful**.

These PRs are not merged. Before integrating #67 or #68, reconcile their workflow diffs with #69 so no old Node.js runtime/action baseline is reintroduced. After each integration/rebase, rerun checks on the exact new SHA. Then port the reviewed slices from #63 to a clean main-based integration branch; never merge #63 wholesale.

## Production authorization — implementation vs deployment

The strict EdDSA issuer/revocation service core, PostgreSQL adapter/schema, and Graph API enforcement path exist in PR #68, but **production authorization is not deployed or production-ready yet**. Required external work remains:

1. A real identity-provider/trusted-gateway adapter and authoritative tenant-membership/grant policy.
2. Secret-manager/KMS custody, rotation and compromise response for signing keys; the data plane receives public keys only.
3. A dedicated PostgreSQL migration/runtime role with explicit least-privilege grants, backups and tested restore.
4. Private networking or mTLS for internal revocation endpoints, rate limits and production transport controls.
5. Audit logging, metrics, alerts, operational ownership and an incident/runbook procedure.
6. Staging end-to-end evidence covering issue, signature verification, tenant/capability/scope denial, revocation, expiry, key rotation and control-plane outage.

Test-only adapters and ephemeral keys are not production credentials. No production deployment can be completed without the actual identity, secret-management, database and network configuration.

The owner-confirmed product name is **Leruchi**. The GitHub repository description still contains the former name and requires an authorized repository metadata update; the available connection can read but not write that setting. Public brand/trademark clearance remains a separate release gate.

## Exact-head validation snapshot — 2026-10-09

- Candidate SHA: `0de25d9d3c9694cd6711fd57286c934ef926290f`.
- Repository workflow matrix: 36/36 successful on this SHA.
- Stage 32 candidate workflow: [37855191769](https://github.com/Leruchii/Leruchi-development/actions/runs/37855191769) passed.
- Architecture Regression Audit: [37855191707](https://github.com/Leruchii/Leruchi-development/actions/runs/37855191707) passed.
- Stage State Gate: [37855191862](https://github.com/Leruchii/Leruchi-development/actions/runs/37855191862) passed.
- PR aggregate: [37855184191](https://github.com/Leruchii/Leruchi-development/actions/runs/37855184191) passed.
- Exact-head sanitized candidate artifact: `leruchi-oss-core-candidate`, artifact ID `11584591199`, metadata digest `sha256:05d3066f82c9c03d16728bbe327d60c29d0b4613207a4b8401fd9fe22f962000`. This artifact must not be attributed to any subsequent SHA.

The current SHA is validated by those workflows, but this does not replace semantic review of the 155-file diff. Keep the candidate draft and do not wholesale merge it.
