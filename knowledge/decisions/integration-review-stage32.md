# Stage 32 Integration Review

Status: **TECHNICAL CANDIDATE BUILT; PUBLICATION GATES OPEN**
Review date: 2026-10-09
Current main SHA at review: `4374e44ef4ee9214553d9863390eebe6cb430f53`
Candidate tracking PR: [#63](https://github.com/Leruchii/Leruchi-development/pull/63) (draft/tracking only; do not merge its stale branch)

## Integrated and validated slices

- [PR #67 — canonical Leruchi identity](https://github.com/Leruchii/Leruchi-development/pull/67) — merged.
- [PR #69 — Node.js 24 CI baseline](https://github.com/Leruchii/Leruchi-development/pull/69) — merged.
- [PR #68 — capability grants/control-plane service core](https://github.com/Leruchii/Leruchi-development/pull/68) — merged.
- [PR #71 — trusted Supabase tenant claims](https://github.com/Leruchii/Leruchi-development/pull/71) — merged.
- [PR #72 — Agent Governance foundation](https://github.com/Leruchii/Leruchi-development/pull/72) — merged.
- [PR #73 — hardened migration runner](https://github.com/Leruchii/Leruchi-development/pull/73) — merged.
- [PR #74 — SDK/CLI source-directory migration](https://github.com/Leruchii/Leruchi-development/pull/74) — merged.
- [PR #75 — OSS readiness/export gates](https://github.com/Leruchii/Leruchi-development/pull/75) — merged.
- [PR #76 — Graph Studio/legacy reconciliation](https://github.com/Leruchii/Leruchi-development/pull/76) — merged.
- [PR #77 — build-state synchronization](https://github.com/Leruchii/Leruchi-development/pull/77) — merged.
- [PR #78 — canonical operations and SDK test paths](https://github.com/Leruchii/Leruchi-development/pull/78) — merged.
- [PR #79 — strict capability grants and Studio integration](https://github.com/Leruchii/Leruchi-development/pull/79) — merged; post-merge matrix 26/26.
- [PR #81 — canonical bootstrap variables with compatibility fallbacks](https://github.com/Leruchii/Leruchi-development/pull/81) — merged; `vibedb` and established database identifiers preserved.
- [PR #82 — Node.js 24 dependency locking](https://github.com/Leruchii/Leruchi-development/pull/82) — merged.
- [PR #83 — dependency license inventory and export audit hardening](https://github.com/Leruchii/Leruchi-development/pull/83) — merged; exact head 23/23 and post-merge matrix 26/26.
- PR #66 was closed as superseded by the integrated identity/runtime/bootstrap slices.

## Current candidate evidence

- Stage 32 run: [37931206154](https://github.com/Leruchii/Leruchi-development/actions/runs/37931206154).
- Artifact ID: `11616112656`, name `leruchi-oss-core-candidate`.
- GitHub archive digest: `sha256:fd8438c94bcfaa2a38372dd63765413c3477dfa45e504e1b74c50c70870c16d3`.
- Contained tarball SHA-256: `64db56ee25b31e5ef1157648ea5c6f0b5341c8aba59d390b17b317a68a2a6f01`.
- Candidate: 200 files. Initial automated path/token/runtime scan found no matches for the configured forbidden patterns.
- Synthetic merge tree and merged-main tree both equal `2850f24b85369cfcadf979db6de36348ed78507a`.
- Dependency inventory covers 138 entries across the root and Studio lockfiles. LGPL/MPL/CC-BY entries need explicit license/attribution compatibility review.
- The ASVS 5.0.0 profile is a verification profile, not a claim of full compliance.

## Owner-controlled blockers

1. Rotate the GitHub credential exposed in project context; never reuse it.
2. Confirm intended visibility of both development and internal/control repositories. Development is public; internal/control visibility could not be independently verified by the current connection.
3. Configure main branch protection/ruleset with required checks. Current branch metadata reports `protected: false`.
4. Manually review the exact 200-file export and all third-party license/notice obligations.
5. Complete any required legal/trademark review and obtain explicit owner release approval.

## Production authorization is separate

Production grant issuance/revocation is not deployed. Real identity-provider/trusted-gateway integration, authoritative tenant policy, signing-key custody/rotation, least-privilege production DB roles, private networking/mTLS, monitoring/alerts, and staging end-to-end/recovery evidence remain deployment requirements.

## Decision

Keep Stage 32 in progress until owner-controlled release gates are recorded as complete. Do not merge PR #63 wholesale. Any change to an allowlisted source file requires a fresh candidate build and exact-SHA evidence. No release tag, release publication, or public export is authorized yet.
