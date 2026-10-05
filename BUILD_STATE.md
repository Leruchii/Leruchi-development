# VibePlatform Build State

This file is the canonical handoff checkpoint for coding agents.

Agents must verify this state against Git history, implementation, tests, CI, and `BUILD_PLAN.md` before continuing. If evidence conflicts with this file, executable repository evidence wins and this file must be corrected.

## Current checkpoint

- Current stage: 22 — Retrieval-Aware Engine-Neutral Planner
- Current status: IN_PROGRESS
- Last completed stage: 21 — Engine-Neutral Planner + PostgreSQL Fallback Foundation
- Previous completed stage: 20 — Production Readiness
- Last validated commit: `c7422314cf36ea1d58cbcac1d5686b6802f67824` (Stage 21 final merge to main; final-head regression and architecture/state gates passed)
- Default branch: `main`
- Deferred stages: 18 — Vibe Cloud Control Plane; 19 — Billing + Metering
- Current branch: `stage22-retrieval-planner`
- Current work: Stage 22 retrieval-aware engine-neutral planning for graph/vector/hybrid retrieval, while preserving the durable bidirectional MCP/developer-first contract, Schema Catalog, ExecutionContext, RLS, guardrails and Secure Execution Engine
- Stage 21 PR #46 merged to `main` as `c7422314cf36ea1d58cbcac1d5686b6802f67824`
- Stage 21 final-head workflow `37309656235` passed; the complete final-head regression matrix passed on commit `97d7bdaae2fe24f16c6486cee0ef9f167e72f682`.
- Architecture Regression Audit and Stage State Gate passed on the final head.
- Next exact action: continue with the next unfinished canonical roadmap stage after re-reading `BUILD_PLAN.md`; do not reopen validated Stage 21 work without contradictory executable evidence.

The Stage 21 planner foundation and constrained PostgreSQL recursive fallback are validated. PostgreSQL recursive execution remains a fallback target only when a compatible compiler capability is explicitly registered; AGE remains the default path. Exit evidence covers recursive compilation, explicit Schema Catalog mappings, tenant/RLS isolation, depth/result guardrails, parameter safety, AGE-equivalent normalized results, planner integration, bounded planner observability, and the full regression matrix.

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