# Stage 32 — OSS Core Public Publication Preparation

Status: IN PROGRESS.

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
