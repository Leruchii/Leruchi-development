# Stage 32 Integration Review

Status: RISK-BASED REVIEW PLAN RECORDED — DO NOT MERGE THE CANDIDATE WHOLESALE; security slice ported to PR #68 for separate review

Review date: 2026-10-09
Base: `main` at the currently verified repository checkpoint
Candidate: `stage32-oss-publication-prep`

## Current comparison

The live compare is the source of truth. At the last exact-head review, candidate `0de25d9d3c9694cd6711fd57286c934ef926290f` was 377 commits ahead and 0 behind, with 155 changed files, 6,303 additions and 606 deletions. The changed-file inventory spans CI, runtime configuration, tenant/security boundaries, package renames, product capabilities, export tooling, security evidence, and release documentation. This is a cross-cutting integration, not a single-stage release change.

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

Do not merge the 362-commit branch as one indivisible PR. Use the candidate as a source of changes and port reviewed, dependency-ordered slices onto a clean branch from current `main`:

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


## Follow-up security review — revocation response semantics

On 2026-10-09, code review found a contradictory response in the candidate control plane: a revoked grant could be returned with `active: true`. The issuer/revocation adapter now returns `active: false` when revocation succeeds and computes lookup activity as `not expired AND not revoked`. The service test now asserts both responses. This fix must pass the exact-head Stage 32 workflow before the control-plane slice is considered validated.


## Follow-up security review — data-plane grant verification and scope

A second review pass found two Graph API boundary defects in the candidate and added fixes/tests:

- Capability grants must be verified with the configured EdDSA public keys. The legacy HS256 path now rejects grant-shaped tokens carrying a JTI or the `leruchi` grant audience instead of passing them into grant-claim validation without EdDSA signature verification.
- Route/graph scope is checked against the actual request. The Schema Catalog scope check now runs only for Schema Catalog requests; previously it ran unconditionally and could deny a valid grant scoped to a graph query.

Added regression coverage for rejecting HS256 grant-shaped tokens and allowing an active EdDSA grant scoped to its requested graph route. These fixes are pending exact-head CI and must not be treated as validated until the workflow passes.

- The revocation adapter now treats `active: false` as denial even when a response reports `revoked: false`; a regression test prevents inactive control-plane decisions from being treated as authorized. This remains pending exact-head CI.


## Exact-head validation snapshot — 2026-10-09

- Candidate SHA: `0de25d9d3c9694cd6711fd57286c934ef926290f`.
- Repository workflow matrix: 36/36 successful on this SHA.
- Stage 32 candidate workflow: [37855191769](https://github.com/Leruchii/Leruchi-development/actions/runs/37855191769) passed.
- Architecture Regression Audit: [37855191707](https://github.com/Leruchii/Leruchi-development/actions/runs/37855191707) passed.
- Stage State Gate: [37855191862](https://github.com/Leruchii/Leruchi-development/actions/runs/37855191862) passed.
- PR aggregate: [37855184191](https://github.com/Leruchii/Leruchi-development/actions/runs/37855184191) passed.
- Exact-head sanitized candidate artifact: `leruchi-oss-core-candidate`, artifact ID `11584591199`, metadata digest `sha256:05d3066f82c9c03d16728bbe327d60c29d0b4613207a4b8401fd9fe22f962000`. This artifact must not be attributed to any subsequent SHA.

The current SHA is validated by those workflows, but this does not replace semantic review of the 155-file diff. Keep the candidate draft and do not wholesale merge it.
