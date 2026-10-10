# Release legal and authorization review dossier

**Status: prepared for authorized review; not legal clearance or release approval.**

## 1. Candidate scope and provenance

- Product/working name: Leruchi Core (the canonical product identity record says public name/trademark clearance remains open).
- Development repository: https://github.com/Leruchii/Leruchi-development
- Public destination: https://github.com/Leruchii/Leruchi
- Current development main at execution checkpoint: `7226e913d40941a97b34b290d5af03a430276429`.
- Candidate source commit previously validated by the Stage 32 workflow: `eae5e31591e9f99a7012b919aa9496650758de14`.
- Stage 32 workflow run: https://github.com/Leruchii/Leruchi-development/actions/runs/38016469817
- Candidate artifact ID: `11655997620`.
- Archive SHA-256: `36c0d81d024876117d2377ef84069150fb88da7963b91fa0e8f9cf6d78ce64e7`.
- Contained tarball SHA-256: `50febc5d3fe651f6cd2df32e4a10757cadacec050f0c4e6933e2d1413eeb41a5`.
- The recorded exact-head workflow reported 200 files audited and reproducibility success. Rebuild from the intended final source commit if any export-eligible file or candidate-builder/audit input changes.

These identifiers are historical candidate evidence. The authorized reviewer must confirm the exact artifact proposed for distribution and whether a fresh candidate is required.

## 2. Available dependency-license inventory

The repository's generated `THIRD_PARTY_NOTICES.md` reports 138 dependency entries: 14 root-lockfile entries and 124 Studio-lockfile entries. Declared license metadata includes:

- MIT: 80 entries
- Apache-2.0: 19 entries
- MPL-2.0: 11 entries
- LGPL-3.0-or-later: 10 entries
- BlueOak-1.0.0: 4 entries
- 0BSD: 2 entries
- BSD-3-Clause: 1 entry
- CC-BY-4.0: 1 entry
- ISC: 6 entries
- Composite expressions include Apache-2.0 combined with LGPL-3.0-or-later and/or MIT.

The inventory is based on declared lockfile metadata. It does not itself verify upstream license texts, notices, redistribution compatibility, or all non-package assets.

## 3. Required review questions

The authorized legal reviewer should record a disposition for each applicable item:

1. **Distribution model:** Is the proposed distribution limited to source code, or does it include compiled/object artifacts, container images, binaries, or bundled Studio assets?
2. **LGPL components:** Determine applicable obligations for optional `sharp`/libvips platform packages and any distribution form that includes them; confirm whether they are included in the intended artifact and what notices/source or relinking obligations apply.
3. **MPL components:** Review the `lightningcss` package family and applicable source-file disclosure/notice requirements for the intended distribution.
4. **CC-BY component:** Review the `caniuse-lite` metadata and required attribution form for the intended distribution.
5. **Notices:** Confirm the final artifact contains required license texts, copyright notices, attribution, and any required NOTICE/source materials.
6. **Non-package assets:** Review schemas, fixtures, examples, copied snippets, fonts/images/icons, generated code, documentation, and other materials not covered by the npm inventory.
7. **Repository license:** Confirm the Apache-2.0 license and copyright attribution accurately reflect the rights granted for the included original work and contributions.
8. **Name and marks:** The product identity record says public brand/trademark clearance remains open. Confirm whether “Leruchi”, repository/package names, domains, and any legacy “Vibe” terminology are cleared for the intended public use.
9. **Contribution provenance:** Confirm any third-party contributions and relevant contributor agreements or permissions are adequate for the proposed distribution.
10. **Public repository contents:** Confirm that only the intended allowlisted public source is published and that private operational material, internal planning, secrets, and unreleased features are excluded.

## 4. Security and release evidence boundaries

- The owner has confirmed that the previously exposed GitHub credential was rotated. This is accepted as owner-confirmed status and is not being reopened without contradictory evidence.
- The development repository's post-merge introduced-change Gitleaks run on main commit `7226e913d40941a97b34b290d5af03a430276429` passed as run `38016936403`. It does not establish that all historical content is secret-free.
- Historical fixed local Compose placeholder findings must be handled only by exact fingerprint and evidence. No broad scanner suppression is approved by this dossier.
- CI success, reproducible artifact digests, and this dossier do not prove legal clearance, trademark clearance, production readiness, or authorization to publish.

## 5. Required approval record

The authorized reviewer/owner must complete the following record after review:

- Reviewer name and authorized role:
- Organization / legal entity:
- Date and time (with timezone):
- Exact candidate commit/tree:
- Exact artifact filename and SHA-256:
- Distribution scope approved:
- License/attribution disposition:
- Name/trademark disposition:
- Required notices and changes:
- Conditions or restrictions:
- Decision: **APPROVED / APPROVED WITH CONDITIONS / NOT APPROVED**
- Evidence link(s) or ticket:
- Release owner acknowledging the decision:

Do not mark the gate approved until this record is completed by an authorized human and linked to the exact intended candidate. Silence is not approval.
