# Leruchi Product Identity

Status: Engineering identity decided; public brand clearance pending.

Leruchi is the canonical engineering working name. **VibeDB is the former product name and must not be reintroduced as a current product, repository, organization, package, CLI, documentation, or architectural identity.** Formal trademark/domain/package/namespace clearance remains open; do not treat Leruchi as a cleared public brand or publish the public OSS repository until the naming review is completed and recorded.

## Canonical GitHub topology

- Enterprise/product: **Leruchi**
- GitHub organization: **Leruchii**
- Intended private development repository: **Leruchii/Leruchi-development** — GitHub currently reports this repository as public; treat this as a security blocker until an authorized administrator changes and verifies visibility.
- Intended private internal control repository: **Leruchii/Leruchi-internal** — GitHub currently reports this repository as public; treat this as a security blocker until an authorized administrator changes and verifies visibility.
- Public OSS Core repository: **Leruchii/Leruchi**

## Engineering rule

All new engineering work and internal references MUST use Leruchi as the working name. Public brand lock, package/repository publication, and release announcements remain blocked until formal naming clearance is recorded. Coding agents must treat the GitHub topology above as authoritative and must not recreate the former VibeDB naming.

Stable internal database identifiers, migration names, historical commit references, compatibility values, or externally persisted identifiers are not renamed merely for branding; changing those requires an explicit migration decision and compatibility plan.

## Handoff rule

Every coding agent must read this file together with BUILD_PLAN.md and BUILD_STATE.md before continuing work. If any active documentation conflicts with this identity contract, update the documentation before proceeding with feature work.
