# OSS Public Source Reconciliation Report

**Status: public-development visibility is accepted and is not a release blocker. The updated candidate passes Stage 32; public PR #11 proposes aligning the remaining 12 shared-file differences. No new tag or release was created.**

## Current live evidence — 2026-10-12

- Public `main`: [`1613ddfc9cc7602c4a6110c9b917923fa99675c2`](https://github.com/Leruchii/Leruchi/commit/1613ddfc9cc7602c4a6110c9b917923fa99675c2).
- Development `main`: [`ee5492c2d1800be609707e80edcbab376d703eac`](https://github.com/Leruchii/Leruchi-development/commit/ee5492c2d1800be609707e80edcbab376d703eac).
- Latest updated candidate: [Stage 32 run 38227310042](https://github.com/Leruchii/Leruchi-development/actions/runs/38227310042), successful against PR #104 code head `a67664a464589a2a4545ca5c1aeb0b654e5e703a`.
- Candidate artifact ID `11736908885`; ZIP size 188,183 bytes; SHA-256 `c90da0ed0332733ad7a87d7d562dc722577cb429f3df4462252b07b411d6995f`. The downloaded ZIP independently matched GitHub's artifact digest.
- Inner candidate archive: 202 regular files, 187,965 bytes; SHA-256 `8be1e96616fec8e044e55f9c99c517e6e79d8aa209cf6560b73737370fd933fc`.
- All 24 observed PR-head workflows completed successfully on code head `a67664a464589a2a4545ca5c1aeb0b654e5e703a`; the later build-state-only commit does not change exported candidate contents. Stage 32 passed Node.js 24, visibility-policy regression, architecture audit in the clean candidate, Supabase credential/loopback tests (6), and clean-consumer SDK/CLI tests (29 passed, 0 failed).
- Public manifest blob: `820adddfaba70410cf1e4584904c2061f030135e`. Development manifest blob: `abd29376a51e7ef20bc22a59fe47b38259819fc6`.
- Public PR #9 is merged at the public commit above. Its explicit legal-dossier exclusion and both public-safe release checklists are now in public `main`. Earlier statements that PR #9 was open or that the public manifest lacked this exclusion are superseded.
- Tree hashes and full repository file counts were not exposed by the connected GitHub read interface in this run; do not reuse the old tree hashes as current evidence.

## Package identity interpretation

The root package mismatch is real, but both root manifests declare `private: true`, so neither root package is intended for direct npm publication. The actual `packages/schema-catalog-api/package.json` is named `@leruchi/schema-catalog-api` in both repositories. Do not rename that actual component solely because the private root package labels differ.

The root manifest and lockfile remain among the shared-file differences and still require reconciliation or an explicit documented reason to preserve the repository-specific private root label. This finding must not be overstated as proof that the public schema-catalog API package itself has been renamed.

## Reconciliation method and metric freshness

The file-level comparison below originated from the prior candidate snapshot. Public PR #9 subsequently added the two checklist files to public `main` and changed the public manifest. The updated development candidate also changed the architecture audit to use public README evidence rather than excluded `BUILD_PLAN.md`, so that path is now identical to public `main`. The current working reconciliation list has **12 shared-file differences**. The full tree was not independently enumerated in this run, so old tree hashes and repository file counts are not presented as current measurements.

## File-level comparison

- Candidate paths derived from the latest Stage 32 artifact: **202 regular files**.
- The two checklist paths previously described as candidate-only now exist in public `main` after PR #9.
- The working difference inventory contains **12 shared paths** requiring file-level reconciliation.
- Previous tree/path counts below are historical comparison data, not freshly enumerated current-tree totals.

### Candidate-only files

- `docs/release/OSS_CORE_RELEASE_CHECKLIST.md`
- `docs/release/REAL_PRODUCTION_ENVIRONMENT_CHECKLIST.md`

These are public release checklists in the candidate but absent from public `main`.

### Shared paths with content differences

- `OSS_EXPORT_MANIFEST.json` — public blob `b7e04031c95837d437e3aec907d5cda5c507f18a`; candidate blob `d81f72daf35e29b7029534e70af5bb6dbffe6ce7`.
- `README.md` — public blob `7cf1625dbabec64d2f428fc62f56cd0826f02efc`; candidate blob `00c9bc253e7d44daad64e8d90823ed2060e86632`.
- `SECURITY.md` — public blob `02d022dc85274cf76b4a26e97541346a2021ce50`; candidate blob `faa29e39a584f2787d84b9018928e3277f91c277`.
- `docker-compose.yml` — public blob `16712972f5af06f7775186ba425c901ade7e7340`; candidate blob `0515cc3a3ea456a6a719420229753066d73d8170`.
- `infra/supabase/docker-compose.yml` — public blob `16712972f5af06f7775186ba425c901ade7e7340`; candidate blob `6951712222d1dc52c85a3d04dc876218286c6bd4`.
- `package-lock.json` — public blob `c2538b6e045e47acb315cbb37ced0f2b6a2d5a5d`; candidate blob `2073263580d97938cceb584ed1a10936f35806ea`.
- `package.json` — public blob `78ecffb021ca79d95aa3a9289b7510362f954f8d`; candidate blob `9f7372ba7c06e2c7694701545e4ec6a080e92881`.
- `packages/graph-api/package.json` — public blob `ef07c8c1e527702706ca5addde3de15b115e5c44`; candidate blob `1cc0b7d459ceb697660c492d2840ffbc74c4675f`.
- `packages/leruchi-cli/package.json` — public blob `cf7b145ee028149873e160b65415990bf0e1bf68`; candidate blob `840fd827db5d1d9e6c4514eb8819293c5ad4910f`.
- `packages/leruchi-sdk/package.json` — public blob `c3ecfa7ac73f7ae41196aac9823f2245fb1ff98e`; candidate blob `cd759c2a7a42160d228a29fd960c53882e463ced`.
- `packages/schema-catalog-api/package.json` — public blob `4d4883b57c6a702fef821f721ed53016de3ade42`; candidate blob `30bec30f3872a32076b873c6149f4a8419007364`.
- `tests/architecture/contract-audit.mjs` — public blob `f470e12461b4dcb9c52b2f0217d2ca05d4afd62b`; candidate blob `007cfd2347fe96173e91ddc9b4f9fc5bcf301bae`.
- `tests/security/supabase-role-credentials.test.mjs` — public blob `9369139fcd627636d3ef884de54b02f1a70fd722`; candidate blob `df2d00a7d98f1eb9ed932c5b92164003417bf5eb`.

### Root package metadata difference

| Field | Public main | Candidate |
|---|---|---|
| Root package name | `@leruchi/schema-catalog-api` | `@leruchi/execution-engine` |
| Root package.json blob | `78ecffb021ca79d95aa3a9289b7510362f954f8d` | `9f7372ba7c06e2c7694701545e4ec6a080e92881` |
| Root lockfile blob | `c2538b6e045e47acb315cbb37ced0f2b6a2d5a5d` | `2073263580d97938cceb584ed1a10936f35806ea` |
| Root package `private` | `true` | `true` |
| Node runtime | `>=24 <25` | `>=24 <25` |

Both root packages are private. The actual `packages/schema-catalog-api` package name is `@leruchi/schema-catalog-api` in both repositories. Treat the root-name difference as private metadata/source drift, not as proof that the public API package must be renamed. The root manifests and lockfiles are included in public PR #11's proposed reconciliation with the current candidate.

## Manifest safety finding — corrected

Public PR #9 merged an explicit exclusion for `docs/release/LEGAL_REVIEW_DOSSIER.md` into public `main`, with a CI regression assertion. The development manifest also explicitly excludes the dossier. The current candidate archive omits the dossier and `BUILD_STATE.md`. This previously identified public-manifest gap is resolved.

## Decisions and actions

1. **Completed:** PR #9 added the legal-dossier exclusion, regression check, and public-safe release checklists to public `main`.
2. **Validate public PR #11:** it aligns the remaining 12 shared-file differences with the updated candidate; do not merge until public CI and release verification pass on its exact head.
3. Merge approved source and policy PRs through the normal review process, then rebuild Stage 32 from the final integrated development SHA and refresh the file-level comparison.
4. Keep the existing `v0.1.0` release/tag untouched. Do not create or publish `v0.1.1` until source reconciliation, exact-candidate validation, and artifact provenance are reviewed.
5. The public visibility of `Leruchi-development` is not a release blocker. Review actual candidate contents for secrets and sensitive material instead.

## Validation limitations

The latest Stage 32 workflow and artifact checksum were verified live. The latest candidate's complete consumer tests passed in CI, but this policy/documentation branch has not yet run its new regression test. No new public release was created. The 13 shared-file differences still require review, and the full tree comparison must be regenerated from the final release candidate before publication.

Machine-readable detail: `OSS_PUBLIC_SOURCE_RECONCILIATION.json`.
