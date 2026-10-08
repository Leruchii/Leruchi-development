# Stage 32 — OSS Core Public Publication Preparation

Status: IN PROGRESS — technical candidate gates passed; development-main integration and public publication remain blocked pending security-boundary remediation.

Stage 31 is the validated release-readiness gate. Stage 32 is the controlled publication preparation layer for Leruchii/Leruchi.

Rules:
- The public repository is a separate release target.
- The private development repository is never copied wholesale.
- OSS_EXPORT_MANIFEST.json is the publication allowlist.
- scripts/public-oss-export-audit.mjs and the sanitized candidate audit must pass before publication.
- Node.js 24 is the only supported publication runtime.
- Internal build/control documents, private strategy, private cloud/enterprise material and internal workflows are not exported.
- Publication credentials must never be committed to the repository.
- The Stage 32 workflow only builds and validates a candidate artifact; it does not publish the public repository.
- Actual publication remains an explicit release action after candidate review.


## Verified current checkpoint — 2026-10-09

- Candidate code head `43b8f0eac4fcbadc3789883c7c18e2bb02a1e6ff`: 57/57 workflow runs passed, zero failures.
- Latest documentation-only candidate head `bb1bbfd87813fcbc6898857e3b5437de707d4f44`: 36/36 workflow runs passed; Stage 32 candidate workflow [37806528083](https://github.com/Leruchii/Leruchi-development/actions/runs/37806528083) passed.
- Sanitized candidate: 184 files; archive SHA-256 `a37f46e019f4bfb7867be5706288bed943fa9231b79b50c7d0a788f3d5917df8`; Node.js 24 runtime policy passed. ASVS 5.0.0 verification profile passed; full ASVS compliance is not claimed.
- PR #63 is the primary draft integration path. PR #64 and PR #65 changes are included in its branch, not in main. PR #60 is closed as superseded.
- GitHub reports both the development repository and internal control repository as public despite the intended private topology. This is a release-blocking security-boundary issue; stop development-main integration and public publication until an authorized administrator changes and verifies visibility.
- Formal product-name clearance remains open. No public files, tag, or release have been published.
- Legacy PRs #14, #22, #26 and #29 remain open and must be reviewed for unique changes before they can be safely closed or integrated.
