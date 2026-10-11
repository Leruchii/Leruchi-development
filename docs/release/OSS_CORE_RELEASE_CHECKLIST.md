# OSS Core Release Checklist

Use this checklist for every public Leruchi Core release. A successful candidate build is necessary but is not, by itself, proof that a public release has been published or verified.

## Before building

- Confirm the exact development source commit and the intended public destination: [Leruchii/Leruchi](https://github.com/Leruchii/Leruchi).
- Confirm Node.js 24 is the only approved runtime.
- Review `OSS_EXPORT_MANIFEST.json`; treat it as an allowlist, not a denylist.
- Confirm that private control-plane material, internal engineering documents, secrets, environment files, and private release-gate tests are excluded.
- Explicitly exclude `docs/release/LEGAL_REVIEW_DOSSIER.md`; it is an internal approval-evidence record and must never ship in the public archive.
- Verify the project license, third-party notices, security reporting instructions, README, and contribution guidance.
- Do not change repository visibility as part of the release automation.

## Candidate validation

- Run the Stage 32 OSS publication-candidate workflow on the exact source state intended for release.
- Require all runtime, capability-policy, OWASP ASVS profile, realtime-boundary, third-party notice, manifest, export-contract, and candidate-readiness steps to pass.
- Build the sanitized candidate and audit its actual contents.
- Build the candidate a second time and compare the normalized archives byte-for-byte.
- Record the source commit SHA, workflow run URL, artifact identifier, archive SHA-256, and artifact location.
- Download and inspect the artifact before publishing. Confirm the archive contains the approved candidate and no unexpected paths.
- If source files included by the manifest change after validation, rerun the candidate workflow. Do not rely on a successful run for an earlier source tree.

## Publication

- Inspect existing tags and releases first. Never overwrite or move an existing release tag to replace an artifact.
- Choose the next version according to the repository's existing versioning convention.
- Publish the verified candidate artifact, not a fresh archive of the unsanitized development checkout.
- Keep engineering-preview/prerelease status explicit unless a separately approved release decision says otherwise.
- Publish release notes that identify the source commit, supported Node.js version, checksum, engineering-preview limitations, and known restrictions.
- Do not claim production readiness, full OWASP ASVS compliance, or complete legal clearance merely because automated checks passed.

## After publication

- Open the public release page and confirm that the intended tag and asset are present.
- Download the public asset and verify its SHA-256 against the checksum recorded for the candidate archive.
- Confirm the published artifact matches the approved candidate. A different checksum means the artifact bytes differ; investigate and compare contents rather than assuming equivalence.
- Verify the public README, license, installation instructions, security reporting link, and release notes.
- Record the public release URL, version, tag, source commit, workflow run, artifact identifier, checksum, and validation result in the development build-state record.
- If the candidate and published artifact do not match, do not describe the release as verified. Preserve existing releases and use the established process for a new version.

## Production boundary

An OSS engineering-preview release is not a production deployment. Production readiness requires separate, real-environment evidence for identity-provider integration, tenant policy, signing-key custody and rotation, least-privilege roles, database/network controls, monitoring and alerting, backup restoration, and rollback. Keep those checks marked not tested until evidence exists.
