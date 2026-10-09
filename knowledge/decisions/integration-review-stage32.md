# Stage 32 Integration Review

Status: IN PROGRESS — clean-main prerequisite slices merged; broad candidate remains unmerged.
Review date: 2026-10-09
Current integrated main HEAD: `acc82d8669779537edc5fe4467630bd87d09b15b`
Candidate branch: `stage32-oss-publication-prep`
Candidate PR: [#63](https://github.com/Leruchii/Leruchi-development/pull/63)

## Completed integration slices
- [PR #69 — Node.js 24 CI baseline](https://github.com/Leruchii/Leruchi-development/pull/69) merged as `621a1790c42ce5f8023a369a94a47c23dc652997`.
- [PR #67 — Leruchi canonical product identity](https://github.com/Leruchii/Leruchi-development/pull/67) merged as `dacd1cdb7522f8e1a59727bc6f82824cbbd55b62`.
- [PR #68 — strict capability grants/control-plane service core](https://github.com/Leruchii/Leruchi-development/pull/68) merged as `acc82d8669779537edc5fe4467630bd87d09b15b`.
- Post-merge CI is running on the exact main HEAD above; at last check 21/24 workflows passed, 3 remained in progress and no failures had appeared. Do not claim the matrix complete until all required checks finish.

## Identity decision
Leruchi is the canonical product identity across active product-facing surfaces. CLI/config/environment/package namespace changes are Leruchi-first with explicit compatibility aliases. The internal SDK/CLI directory rename and versioned migration of protocol/persisted identifiers remain separate work; do not use blind global replacement.

## Candidate boundary
The Stage 32 candidate is 380 commits ahead and 3 behind main, with 155 changed files. Its old green CI and artifact evidence apply only to the candidate SHA. Do not merge it wholesale. Review and port dependency-ordered slices onto current main, rerunning the full relevant matrix after every merge.

## Remaining slices
1. Tenant-claim hook, Supabase role/privilege changes and cross-tenant adversarial tests.
2. SDK/CLI internal source-directory renames and all import/entry-point compatibility changes.
3. Agent Governance package and tests.
4. OSS readiness/export manifest, Apache-2.0 license, sanitizer/audit/build scripts, security verification evidence and Stage 31/32 workflows.
5. Review the unique diffs from closed, unmerged PRs #14, #22, #26 and #29; port only still-relevant changes.

## Release and owner gates
- Repository visibility is owner-managed; do not change it via automation. The owner must verify intended visibility before public export/release.
- Production grant issuance/revocation is not deployed. Real identity/policy adapters, signing-key custody/rotation, least-privilege DB roles, private networking/mTLS, operational monitoring and staging evidence remain required.
- Formal product-name clearance remains open.
- Rebuild and inspect the sanitized OSS artifact from the final integrated SHA; historical archive digests do not carry forward.
- No public export, tag or release is authorized without explicit approval.

## Decision
Keep Stage 32 IN PROGRESS. Integrate only reviewed slices, record exact SHAs and CI evidence, and preserve the public/internal repository boundary.
