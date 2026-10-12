# Development Repository Visibility and OSS Publication Policy

Decision date: 2026-10-12  
Status: **FINAL OWNER DECISION — ADOPTED**

## Decision

The owner has decided that `Leruchii/Leruchi-development` may remain public and that its public visibility is **not, by itself, a blocker to publishing the sanitized Leruchi OSS Core**.

This is a final policy decision, not an open design question. Future agents must not re-open it or require the development repository to become private before release.

## Required behavior

- Do not fail, pause, or block an OSS publication workflow solely because `Leruchii/Leruchi-development` is public.
- Do not add a CI or release gate that requires the development repository to be private.
- Do not classify the development repository's visibility alone as a security defect.
- Continue checking the exact candidate artifact for credentials, private keys, confidential/internal-only files, customer data, and other sensitive content.
- Treat an actual secret or sensitive-content exposure as its own finding, with specific evidence and remediation. Do not confuse artifact-content safety with repository visibility.
- Do not change repository visibility settings through automation.
- Do not copy the entire development or internal-control repository into the OSS destination; publish only the reviewed, allowlisted candidate.
- Keep production-readiness and release authorization as separate checks.

## Internal repository distinction

This decision applies specifically to `Leruchii/Leruchi-development`. It does not authorize publishing internal-control-plane material or secrets. If the internal repository or another source contains actual confidential material, assess and handle that concrete exposure through the owner-approved process. The visibility of the development repository must not be used as a substitute for this content review.

## Rationale

Repository visibility describes who can see a repository. The release boundary is enforced by reviewing and exporting a deliberately allowlisted artifact, validating its contents, and verifying its provenance. A public development repository can support that process without being a release blocker, provided the actual candidate passes the required content and security checks.

## Agent and CI contract

This decision supersedes older instructions that said to stop publication whenever the development repository was public. In particular, keep `AGENTS.md`, `PRODUCT_IDENTITY.md`, `BUILD_PLAN.md`, `BUILD_STATE.md`, repository-boundary decisions, release checklists, and automation consistent with this policy.
