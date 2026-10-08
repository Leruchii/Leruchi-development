# Stage 32 — OSS Core Publication Preparation

Status: TECHNICAL CANDIDATE VALIDATED; development-main integration and public publication remain blocked pending user-owned repository-visibility remediation, formal product-name clearance, full-diff review, and explicit release approval.

Stage 31 is the validated release-readiness gate. Stage 32 is the controlled publication-preparation layer for Leruchii/Leruchi.

## Non-negotiable rules

- The public repository is a separate release target.
- Never copy the development repository wholesale.
- `OSS_EXPORT_MANIFEST.json` is the publication allowlist.
- `scripts/public-oss-export-audit.mjs` and the sanitized candidate audit must pass before publication.
- Node.js 24 is the only supported publication runtime; Node.js 20 is prohibited.
- Internal build/control documents, private strategy, private cloud/enterprise material, and internal workflows are not exported.
- Publication credentials must never be committed to the repository.
- The Stage 32 workflow builds and validates a candidate artifact; it does not publish the public repository.
- Publication remains a separate explicit release action after candidate review and user approval.
- OWASP ASVS 5.0.0 is a verification profile; full ASVS compliance is not claimed.

## Verified current checkpoint — 2026-10-09

### Candidate and CI
- Current candidate HEAD: `bf650537f90650f96ddca0fac33281ee545d46e1`.
- Development `main` HEAD: `2e3997a75c709b58da14c454b356ae9778d1e1be`.
- [PR #63](https://github.com/Leruchii/Leruchi-development/pull/63) remains OPEN and DRAFT. Nothing has been merged to development `main`; public publication has not occurred.
- Exact-head matrix on candidate HEAD: **36/36 workflow runs completed successfully; zero failures** before this documentation reconciliation. The new documentation commit must be revalidated at its own SHA; prior results are not inherited.
- Stage 32 candidate workflow: [run 37833835499](https://github.com/Leruchii/Leruchi-development/actions/runs/37833835499) — success on the pre-reconciliation candidate.
- Stage 31 readiness: [run 37833835429](https://github.com/Leruchii/Leruchi-development/actions/runs/37833835429) — success on the pre-reconciliation candidate.
- Stage 11 CLI: [run 37833835738](https://github.com/Leruchii/Leruchi-development/actions/runs/37833835738) — success on the pre-reconciliation candidate.
- Stage 13 Graph Studio: [run 37833835394](https://github.com/Leruchii/Leruchi-development/actions/runs/37833835394) — success on the pre-reconciliation candidate.
- Architecture regression audit: [run 37833835437](https://github.com/Leruchii/Leruchi-development/actions/runs/37833835437) — success on the pre-reconciliation candidate.
- Stage State Gate: [run 37833835600](https://github.com/Leruchii/Leruchi-development/actions/runs/37833835600); PR check: [run 37833833283](https://github.com/Leruchii/Leruchi-development/actions/runs/37833833283) — success on the pre-reconciliation candidate.
- Live GitHub compare: **361 commits ahead, 0 behind** development `main`; PR #63 has **149 changed files, 5,852 additions, 576 deletions**. This is a broad integration diff, not a Stage 32-only change.

### Exact-head sanitized artifact
- Artifact name: `leruchi-oss-core-candidate`; artifact ID: `11573439776`; source run: `37833835499`; source SHA: `bf650537f90650f96ddca0fac33281ee545d46e1`.
- Packaged tar.gz SHA-256: `436efd61f12dbc084fd881ef97ce8596629c1f7c4c1f372ee18d37f78f806ca6`.
- Downloaded artifact ZIP SHA-256: `f4895023e7e3f82f4504cca8f18552eccf18be999386d499eace8bbd92174a7d`.
- Independent archive inspection found 184 files, `.nvmrc = 24`, package engine `>=24 <25`, and no retired VibeDB-name or GitHub PAT-pattern matches in the exported files.
- Manifest validation, source export audit, sanitized candidate readiness audit, and reproducible rebuild/package comparison passed for that earlier exact source SHA. These results do not validate a newly built artifact until rerun on the new candidate SHA.
- Docker image metadata and OSS readiness/backup test fixtures were aligned with the current Leruchi identity before artifact generation.

### Pull request reconciliation
Closed as superseded with explanatory comments; none of these legacy PRs was merged:
- [PR #14](https://github.com/Leruchii/Leruchi-development/pull/14): old `packages/vibe-cli` branch. The canonical implementation is `packages/leruchi-cli`; current Stage 11 CI covers migration execution through `vibe_migrator`, migration ledger checks, remote Schema Catalog integration, and architecture regression auditing.
- [PR #22](https://github.com/Leruchii/Leruchi-development/pull/22): superseded Graph API runtime branch.
- [PR #26](https://github.com/Leruchii/Leruchi-development/pull/26): superseded browser-validation branch.
- [PR #29](https://github.com/Leruchii/Leruchi-development/pull/29): superseded renderer benchmark branch; maintained benchmark is `apps/studio/tests/browser/renderer-benchmark.spec.ts`.
- [PR #60](https://github.com/Leruchii/Leruchi-development/pull/60) remains closed and unmerged.
- [PR #64](https://github.com/Leruchii/Leruchi-development/pull/64) and [PR #65](https://github.com/Leruchii/Leruchi-development/pull/65) are closed as merged in their respective histories. PR #63 remains the current draft integration path.
- Legacy branches remain available for reference. Do not merge old, heavily diverged branches wholesale; port newly discovered safety gaps into canonical code and validate them with focused tests.

### Integration diff and remaining blockers
- Repository visibility is user-owned. The user will handle remediation. Before integration, re-query and verify required private settings for both development and internal repositories; do not assume the change has happened.
- Formal product-name clearance remains pending. Do not treat Leruchi as a cleared public brand until clearance is documented.
- Production deployments must provide a trusted capability-grant issuer and revocation authority; test-only fixtures do not prove production deployment readiness.
- Re-query exact-head CI and rebuild/review the artifact after this checkpoint commit; do not reuse earlier green checks or artifact as evidence for a new SHA.
- Review the full 361-commit / 149-file integration diff and agree on strategy before merge.
- Integrate Stage 32 only after all blockers are closed. Integration into development `main` is not public publication.
- Copy/export to `Leruchii/Leruchi` or create a public release only after a separate explicit user approval and the controlled export gate.
