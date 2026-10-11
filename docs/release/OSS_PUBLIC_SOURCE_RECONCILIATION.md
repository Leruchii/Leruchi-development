# OSS Public Source Reconciliation Report

**Status: publication remains blocked; no tag or release was created.**

## Executive summary

The Stage 32 candidate is reproducible and the downloaded artifact matches its recorded checksum. However, the public repository is not a content-identical source snapshot of the sanitized candidate. The correct response is not to copy the development repository wholesale or rename packages automatically. The package identity and multiple source-file differences need an explicit public-source decision.

## Current repository state

- Public `main`: `ca9187dcb9e216f896c5f4b48e31ff932ad2b959`; tree `13f679ccea901d8142dfce652cc7bc037b80c0c4`; 538 regular files.
- Development `main`: `a1f1011342ef4f45320a1733a1366c970102c15c`; tree `fea0c9c3769fb8f3bd5589bdb8b29a30219741da`; 340 regular files.
- Existing public release: [v0.1.0-engineering-preview](https://github.com/Leruchii/Leruchi/releases/tag/v0.1.0-engineering-preview). Preserve it unchanged.
- Proposed `v0.1.1-engineering-preview` was absent at the last owner-side CLI check; no release was created in this task.

## Candidate evidence

- Stage 32: [successful workflow run](https://github.com/Leruchii/Leruchi-development/actions/runs/38126397395), workflow head `a82533db4a6b60fbfb8147ec31d452163e6088d6`.
- Source `main`: `a1f1011342ef4f45320a1733a1366c970102c15c`, tree `fea0c9c3769fb8f3bd5589bdb8b29a30219741da`.
- Artifact ID: `11697531929`; ZIP SHA-256: `52012743c38a034503c550d960fc8fe1a0e7dab1aadd2ca46a03b4af2ba33e9d`.
- Inner candidate archive: 202 regular files, 186,904 bytes; SHA-256 `e1b50ac21d1ea37f6ffc9a305e2c8ccf46577f45149d8b4b46e0e7e6a9f860e0`.
- Recorded clean Node.js 24 consumer tests: 29 passed, 0 failed.
- Artifact inspection confirmed `BUILD_STATE.md` and `docs/release/LEGAL_REVIEW_DOSSIER.md` are absent.

## File-level comparison

- Candidate paths derived from the development allowlist: **202**.
- Shared paths with public `main`: **200**.
- Shared files with identical Git blob SHA: **187**.
- Shared files with different Git blob SHA: **13**.
- Candidate-only paths: **2**.
- Public-only paths outside the candidate path set: **338**.

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

### Important package identity difference

| Field | Public main | Candidate |
|---|---|---|
| Root package name | `@leruchi/schema-catalog-api` | `@leruchi/execution-engine` |
| Root package.json blob | `78ecffb021ca79d95aa3a9289b7510362f954f8d` | `9f7372ba7c06e2c7694701545e4ec6a080e92881` |
| Root lockfile blob | `c2538b6e045e47acb315cbb37ced0f2b6a2d5a5d` | `2073263580d97938cceb584ed1a10936f35806ea` |
| Node runtime | `>=24 <25` | `>=24 <25` |

This difference is **unresolved**, not an automatic instruction to rename or replace either package. The public tree also contains many older flat-layout/alias paths not included in the sanitized export. The report's JSON file lists all public-only paths and every differing shared blob SHA.

## Manifest safety finding

The development manifest explicitly excludes `docs/release/LEGAL_REVIEW_DOSSIER.md`; the public manifest does not. The dossier is not present in the current public tree or candidate, but the public manifest's `docs/**` allow rule makes an explicit exclusion a sensible defense-in-depth correction.

## Decisions and actions

1. **Safe fix:** add the legal-review dossier exclusion to the public manifest on a branch and add the two public-safe release checklists missing from public `main`; let public CI validate the proposed change.
2. **Do not automatically replace root package metadata or the 13 differing shared files.** First decide whether the public repository's canonical source should be brought into alignment with the sanitized candidate or whether a documented dual-snapshot strategy is intended.
3. Keep the existing `v0.1.0` release/tag untouched.
4. Do not create or publish `v0.1.1` until the source/tag strategy, candidate, and asset provenance are reviewed.
5. Correct UTF-8 text encoding has been verified in the local release notes and publisher script; no release action was run.

## Validation limitations

The candidate workflow is green and the archive hash is verified. This reconciliation task did not rerun the complete test suite locally, nor did it publish a release. Public CI should validate the safe public-branch changes. The unresolved package/source alignment requires a deliberate decision before final release validation.

Machine-readable detail: `OSS_PUBLIC_SOURCE_RECONCILIATION.json`.
