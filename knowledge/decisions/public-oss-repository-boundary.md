# Public Open-Source Repository Boundary

Decision date: 2026-10-10
Status: **ADOPTED**

## Decision

- Public distribution home: [`Leruchii/Leruchi`](https://github.com/Leruchii/Leruchi).
- Engineering workspace and CI/candidate-generation home: [`Leruchii/Leruchi-development`](https://github.com/Leruchii/Leruchi-development).
- Internal/control-plane repository: [`Leruchii/Leruchi-internal`](https://github.com/Leruchii/Leruchi-internal). Its current GitHub metadata reports public visibility; do not change visibility automatically, and leave any visibility correction to the owner.
- Do not use the development repository as the public release destination.
- Do not copy or mirror the entire development or internal/control-plane repository into the public destination.

## Promotion contract

1. Develop and test in the engineering repository.
2. Build the allowlisted source export using Stage 32.
3. Record the exact source commit SHA, export tree SHA, artifact digest, and archive hash.
4. Verify the export boundary and configured credential/runtime scans.
5. Follow the legal/license/attribution conditions in the owner-confirmed approval for the exact intended distribution scope. The generated inventory is evidence and does not expand that approved scope.
6. Confirm the owner-approved product name is Leruchi and retain the approval record; the owner confirms legal/release approval has been obtained.
7. Promote only the approved export into `Leruchii/Leruchi`, then create the versioned tag and release notes.
8. State clearly that the release is an engineering preview until production identity, authorization, key custody, networking, monitoring, and recovery gates are complete.

## Current state

- `Leruchii/Leruchi` is public and its README identifies it as the intended public home.
- The README is a project landing page; the Stage 32 source export has not yet been promoted there.
- No versioned public release has been published.
- The current candidate source commit is `bbdd9aa2265c952328f064cd7bbcd17a2a3bc1f5`; documentation-only commits in the engineering repository are excluded from the candidate export.
- The candidate dependency inventory contains license expressions covered by the owner's confirmed legal/release approval for the intended scope. Preserve the underlying approval record; any broader distribution requires a fresh scope review.
- Token rotation, repository visibility and branch protection are owner-managed follow-ups per owner direction. Automation must not change those settings or treat them as blockers to the technical export work.

## Safety rules for future agents

- Never include credentials, internal control-plane implementation, private repository content, deployment secrets, or local test secrets in the public export.
- Never infer that a repository is the internal/control-plane repository from its name alone; verify its exact URL and access before interacting with it.
- Any change to an allowlisted/exported source file requires a fresh Stage 32 run and exact-SHA evidence.
- Do not add an arbitrary license file or claim legal compliance without an explicit owner decision.
