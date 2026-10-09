# Stage 32 Integration Review

Status: **TECHNICAL CANDIDATE BUILT, CI-VALIDATED, AND EXPORT-REVIEWED**
Review date: 2026-10-10
Candidate source SHA: `bbdd9aa2265c952328f064cd7bbcd17a2a3bc1f5` (later handoff-document commits are excluded from the public export)
Candidate tracking PR: [#63](https://github.com/Leruchii/Leruchi-development/pull/63) (tracking only; do not merge its stale branch)

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
- [PR #81 — canonical bootstrap variables with compatibility fallbacks](https://github.com/Leruchii/Leruchi-development/pull/81) — merged.
- [PR #82 — Node.js 24 dependency locking](https://github.com/Leruchii/Leruchi-development/pull/82) — merged.
- [PR #83 — dependency license inventory and export audit hardening](https://github.com/Leruchii/Leruchi-development/pull/83) — merged; exact head 23/23 and post-merge matrix 26/26.
- [PR #84 — trigger Stage 31/32 for every exportable path](https://github.com/Leruchii/Leruchi-development/pull/84) — merged; exact head 22/22 and post-merge matrix 26/26.
- PR #66 was closed as superseded by the integrated identity/runtime/bootstrap slices.

## Candidate and export review evidence

- Stage 32 run: [37932619969](https://github.com/Leruchii/Leruchi-development/actions/runs/37932619969); candidate job and all its steps passed.
- Artifact ID: `11617171934`, name `leruchi-oss-core-candidate`.
- GitHub archive digest: `sha256:de51a538f153cbce2e9e3cf11cee60616f040662fde434565cf40bbab6c15aa9`.
- Contained tarball SHA-256: `57d22c00e03c3d141580330551eb57824c15ed08968860ca3b93a5d957a77bab`.
- Candidate contains 200 files. The inspected path inventory contained no excluded control paths. Targeted scans returned zero matches for configured common credential/private-key patterns or Node.js 20 runtime settings; these bounded scans are not a guarantee that every possible secret is absent.
- The synthetic merge tree and merged-main tree both equal `bf1d114aac1bab60b5f704f471d7b42d244e3c71`.
- `THIRD_PARTY_NOTICES.md` inventories 138 dependency entries across root and Studio lockfiles, with 11 license expressions. LGPL/MPL/CC-BY entries remain flagged for any required distribution/attribution review.
- The ASVS 5.0.0 profile is a verification profile, not a claim of full compliance.

## Owner-managed security follow-ups

Per owner direction on 2026-10-10, token rotation, branch protection and repository-visibility settings remain owner-operated. Do not change them through automation, and do not treat them as blockers to completing or publishing the OSS source export. They remain important security/admin follow-ups. The current connection cannot verify internal/control repository visibility or read main's branch-protection settings.

## Production authorization is separate

Production grant issuance/revocation is not deployed. Real identity-provider/trusted-gateway integration, authoritative tenant policy, signing-key custody/rotation, least-privilege production DB roles, private networking/mTLS, monitoring/alerts, and staging end-to-end/recovery evidence remain production requirements.

## Public repository boundary

- Official public destination: [`Leruchii/Leruchi`](https://github.com/Leruchii/Leruchi).
- Engineering and candidate validation repository: [`Leruchii/Leruchi-development`](https://github.com/Leruchii/Leruchi-development).
- The public destination README has been updated to explain the project and clearly state that the reviewed source export and versioned release are not yet published there.
- Promotion must copy only the allowlisted Stage 32 export after the applicable license/attribution and owner approval gates. Do not mirror the whole development repository or any internal/control-plane repository.
- The README-only change in the public repository is not a source release and does not change the candidate SHA or its artifact digests.

## Decision

The technical candidate is built, CI-validated, reproducibly packaged and reviewed for export paths and high-risk configuration. Any formal release must describe Leruchi as an engineering preview and must not imply production readiness or full ASVS compliance. Any change to an allowlisted source file requires a fresh Stage 32 build and exact-SHA evidence. License/attribution and product-name/trademark review remain separate legal/owner considerations, not work for an automation agent to certify.