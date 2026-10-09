# Stage 32 — OSS Core Publication Preparation

Status: IN PROGRESS — release tooling is being integrated on clean development main; no public artifact has been published.

## Non-negotiable rules

- The public repository is a separate release target.
- Never copy the development repository wholesale.
- `OSS_EXPORT_MANIFEST.json` is the public export allowlist.
- `scripts/public-oss-export-audit.mjs` verifies the export contract.
- `scripts/build-oss-core-candidate.mjs` builds only tracked files permitted by the allowlist and rejects symlinks or unsupported file modes.
- `scripts/oss-core-readiness-audit.mjs` checks the sanitized candidate for private control paths, oversized files and credential/private-key patterns.
- Node.js 24 is the only supported publication runtime.
- Internal build/control documents, private strategy, internal workflows, Cloud/Enterprise implementation and secrets must not enter the public candidate.
- Candidate build workflows create review artifacts only; they do not publish to the public repository.
- The owner has resolved the engineering naming choice in favor of Leruchi; see `knowledge/decisions/product-naming-review.md`. This is not trademark/legal clearance. Publication requires exact-head CI, final diff/artifact/license/provenance review, repository-visibility remediation, any needed formal legal review and explicit release approval.

## Current integration baseline

- Development main at start of this slice: `2fe5b99ccabebadded348675b1c0335aceac9974`; its post-merge matrix passed 23/23.
- PR #72 Agent Governance merged with 18/18 exact-head workflows passing.
- PR #73 migration runner safety merged with 23/23 exact-head workflows passing.
- PR #74 SDK/CLI source-directory migration merged with 30/30 exact-head workflows passing.
- The current OSS readiness branch is a port of individually reviewed candidate files, not a wholesale merge of PR #63's 380-commit branch.
- GitHub last reported both development and internal-control repositories as public. An authorized owner must change and verify intended visibility before any Stage 32 integration/export. No visibility settings were changed here.
- The Apache-2.0 license is selected for the intended OSS Core. Final license inventory, sanitized file list and provenance must be rebuilt from the final integrated SHA.
- The owner naming decision is recorded as Leruchi; trademark/domain/package namespace screening remains a separate pre-commercialization consideration, not an engineering rename task.
- OWASP ASVS 5.0.0 is used as a conservative verification profile. Unmapped/partial/blocked items remain visible; this is not a claim of full ASVS compliance.

## Manifest boundaries

The export manifest intentionally excludes internal control documents and readiness-only tests. The public artifact must contain only reviewed product/runtime/tooling files. The build process must be deterministic and the archive digest must be recorded from the exact candidate SHA.

## Exit gate

1. Manifest and export audit pass.
2. Readiness audit passes on the built candidate.
3. OWASP ASVS profile verifier and its tests pass, without claiming full compliance.
4. Candidate is built twice from the same tracked tree and normalized archives compare byte-for-byte.
5. License and provenance review is complete.
6. All required workflows pass on the exact final SHA.
7. Repository visibility is remediated and verified by the owner.
8. The owner naming decision is recorded; any required formal trademark/legal clearance is reviewed, and explicit release approval is obtained.

Until every item is closed, Stage 32 remains IN PROGRESS and no public tag, release or export is authorized.
