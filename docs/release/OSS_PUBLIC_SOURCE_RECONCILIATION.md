# OSS Public Source Reconciliation Report

**Status: source reconciliation completed and merged. The public development repository is permitted and is not a release blocker. Publication remains pending final post-merge-main candidate evidence and explicit release authorization. No new tag or release was created.**

## Current repository state — 2026-10-12

- Public `main`: [`f45a6a38f4a5e16e06bc1ad937edec8dcf8f6414`](https://github.com/Leruchii/Leruchi/commit/f45a6a38f4a5e16e06bc1ad937edec8dcf8f6414), created by merged source reconciliation PR #11.
- Development source-reconciliation merge: [`68324a2f1de0227b60ed2443a59d44082499db4b`](https://github.com/Leruchii/Leruchi-development/commit/68324a2f1de0227b60ed2443a59d44082499db4b), created by merged policy/validation PR #104. Latest observed development `main` control/documentation commit: [`ad357f4aba6d03af1f92fd63740e92147b733347`](https://github.com/Leruchii/Leruchi-development/commit/ad357f4aba6d03af1f92fd63740e92147b733347); this updates Stage 32 push-path triggers and excluded release-state records, not candidate product source files.
- Public policy checklist PR #10 is merged as [`7ffd398903ff2858cca6ca79554ec14b4c460605`](https://github.com/Leruchii/Leruchi/commit/7ffd398903ff2858cca6ca79554ec14b4c460605).
- Public manifest and development manifest now have the same Git blob SHA: `abd29376a51e7ef20bc22a59fe47b38259819fc6`.
- The actual `packages/schema-catalog-api` package remains `@leruchi/schema-catalog-api`. Both root packages are private and now have the same root package name and lockfile metadata: `@leruchi/execution-engine`.

## Candidate evidence

- Latest fully inspected Stage 32 run: [38227841712](https://github.com/Leruchii/Leruchi-development/actions/runs/38227841712), successful on development PR #104 code head `41a1af0a8dc3ef34cff69d58c6a153da6fcc4110`. All 24 observed PR workflow runs on that head completed successfully.
- Candidate artifact ID: `11737275523`; ZIP size 188,183 bytes; SHA-256 `74962682501ce612c0be80c89362329d725744bb0f73430355990e2a138364fe`. The downloaded ZIP was independently hashed and matched GitHub's artifact digest.
- Inner archive: 202 regular files, 187,965 bytes; SHA-256 `8be1e96616fec8e044e55f9c99c517e6e79d8aa209cf6560b73737370fd933fc`.
- Reproducible archive comparison passed. The extracted candidate passed the architecture audit and Supabase credential/loopback test (6 tests); SDK/CLI clean-consumer tests passed (29 passed, 0 failed).
- Node.js 24 runtime policy, the visibility-policy regression test, capability/revocation tests, OWASP ASVS verification profile, tenant/realtime boundary, dependency/license inventory, manifest validation, export audit, readiness audit, and artifact upload all passed.
- The artifact excludes `BUILD_STATE.md`, `docs/release/LEGAL_REVIEW_DOSSIER.md`, and internal source-reconciliation reports. The export manifest explicitly excludes the legal dossier and reconciliation reports.

## Source reconciliation result

The prior file-level inventory identified 13 shared paths with differing content. One path, `tests/architecture/contract-audit.mjs`, was corrected to match the public-safe version because the sanitized artifact deliberately excludes `BUILD_PLAN.md`. Public PR #11 then aligned the remaining 12 files to the reviewed candidate.

The 12 reconciled paths were:
- `OSS_EXPORT_MANIFEST.json`
- `README.md`
- `SECURITY.md`
- `docker-compose.yml`
- `infra/supabase/docker-compose.yml`
- `package.json`
- `package-lock.json`
- `packages/graph-api/package.json`
- `packages/leruchi-cli/package.json`
- `packages/leruchi-sdk/package.json`
- `packages/schema-catalog-api/package.json`
- `tests/security/supabase-role-credentials.test.mjs`

After merge, all 13 previously differing paths were checked and have matching public/development Git blob SHAs. The prior inventory recorded 190 other shared paths as identical; combined with the 12 reconciled files, the 202 candidate paths are now accounted for as identical to the public source. The full repository trees were not independently enumerated in this run, so old repository-wide file counts and tree hashes are intentionally not represented as current.

## Final visibility policy

**Final owner decision:** `Leruchii/Leruchi-development` may remain public. Its visibility is not a release blocker and must not be used as a CI or publication gate. Continue to inspect the actual candidate for secrets, credentials, confidential/internal-only files, and customer data; concrete content exposures are separate security findings.

This decision is recorded in the development agent instructions, product identity, build plan, repository-boundary decision, durable decision record, regression test, Stage 32 workflow, and public OSS release checklist.

## Release status and next actions

- Preserve the existing [`v0.1.0-engineering-preview`](https://github.com/Leruchii/Leruchi/releases/tag/v0.1.0-engineering-preview) unchanged.
- No `v0.1.1-engineering-preview` tag/release was created.
- The connected workflow lookup verified the PR-head Stage 32 run, but does not expose push-triggered runs. The latest observed development control commit is `ad357f4aba6d03af1f92fd63740e92147b733347`; no exact-main run ID/artifact could be independently confirmed. Before publication, confirm a successful Stage 32 run for the exact source/control state and record its artifact checksum. The PR-head artifact is strong evidence because the candidate source changes are merged, but do not represent it as exact-main validation.
- After exact-main validation, obtain the required release authorization, prepare the next version separately, and verify the published asset checksum. Do not overwrite or move the existing `v0.1.0-engineering-preview` tag.
- Production readiness remains a separate real-environment assessment. An engineering-preview release is not a production-readiness claim.
