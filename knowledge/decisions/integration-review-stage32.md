# Stage 32 Integration Review

Status: IN PROGRESS — dependency-ordered slices are integrated; the broad candidate branch remains unmerged.
Review date: 2026-10-09
Last verified main baseline before PR #81: `8ebfe49253fedc6e26e7f42d67312118493cd6d1`
Candidate branch: `stage32-oss-publication-prep`
Candidate PR: [#63](https://github.com/Leruchii/Leruchi-development/pull/63)

## Integrated slices

- [PR #69 — Node.js 24 CI baseline](https://github.com/Leruchii/Leruchi-development/pull/69).
- [PR #67 — canonical Leruchi product identity](https://github.com/Leruchii/Leruchi-development/pull/67).
- [PR #68 — strict capability grants/control-plane service core](https://github.com/Leruchii/Leruchi-development/pull/68).
- [PR #71 — trusted Supabase tenant claims](https://github.com/Leruchii/Leruchi-development/pull/71).
- [PR #72 — Agent Governance foundation](https://github.com/Leruchii/Leruchi-development/pull/72).
- [PR #73 — hardened migration runner](https://github.com/Leruchii/Leruchi-development/pull/73).
- [PR #74 — SDK/CLI source-directory migration](https://github.com/Leruchii/Leruchi-development/pull/74).
- [PR #75 — OSS readiness/export gates](https://github.com/Leruchii/Leruchi-development/pull/75).
- [PR #76 — Graph Studio/legacy PR reconciliation](https://github.com/Leruchii/Leruchi-development/pull/76).
- [PR #77 — build-state synchronization](https://github.com/Leruchii/Leruchi-development/pull/77).
- [PR #78 — canonical operations and SDK test paths](https://github.com/Leruchii/Leruchi-development/pull/78).
- [PR #80 — current build checkpoint reconciliation](https://github.com/Leruchii/Leruchi-development/pull/80).
- PR #81 adds canonical database bootstrap environment variables with legacy fallbacks, a contract test, and the owner naming decision; it remains under exact-head CI review.

## Candidate branch assessment

The candidate branch is 380 commits ahead, 12 behind, with 155 changed files relative to current main. Its historical CI and artifact evidence applies only to the old candidate SHA.

A tree comparison shows most candidate functionality has already been integrated or superseded by later clean-main slices. The remaining path-level candidate-only files were the product-naming decision record and a renamed database bootstrap script. PR #81 ports the naming record and preserves the useful environment-name compatibility behavior without blindly renaming the bootstrap path or database.

Continue to compare shared-path content selectively. Do not merge PR #63 or cherry-pick its broad diff wholesale. Keep exact source SHA and test evidence for every port.

## Legacy PRs #22, #26 and #29

- PR #22's early Graph API is superseded by the current authenticated Graph API, Query IR/Mutation IR validation, compiler, retrieval/explainability, agent planning, audit and observability surfaces.
- PR #26's browser tests are superseded by the current Playwright Studio/browser tests and tenant-render contract.
- PR #29's renderer benchmark is superseded by the current benchmark covering 100, 500 and 1,000 nodes and visible-node interaction. It still lacks the 1,000-node/3,000-edge density case; keep that performance decision open.
- No legacy branch is merged wholesale.

## Release and owner gates

- Repository visibility is owner-managed; verify intended visibility before any public export. No visibility changes were made by automation.
- The owner decision to retain Leruchi is recorded, but it is not legal/trademark clearance.
- Production grant issuance/revocation is not deployed; real identity/policy adapters, signing-key custody/rotation, least-privilege production DB roles, private networking/mTLS, monitoring and staging evidence remain required.
- Rebuild and inspect the sanitized OSS artifact from the final integrated tree; historical archive digests do not carry forward.
- No public export, tag or release is authorized without explicit approval.

## Decision

Keep Stage 32 IN PROGRESS. Finish exact-head validation, selective candidate reconciliation, final artifact/license/provenance review, and owner-managed release gates.
