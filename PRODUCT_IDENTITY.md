# Leruchi Product Identity

Status: Canonical product name confirmed by owner on 2026-10-09; engineering rename in progress; formal public brand clearance remains pending.

Leruchi is the sole canonical product name for application UI, docs, packages, CLI, schemas, examples, and architecture. VibeDB is historical-only and must not appear as a current product identity. The owner has confirmed the name; this is an engineering naming decision, not legal clearance. Trademark, domain, package, and namespace checks remain open; public OSS publication remains blocked until those checks and the security visibility gate are recorded as complete.

## Canonical GitHub topology

- Enterprise/product: **Leruchi**
- GitHub organization: **Leruchii**
- Intended private development repository: **Leruchii/Leruchi-development** — GitHub currently reports this repository as public; treat this as a security blocker until an authorized administrator changes and verifies visibility.
- Intended private internal control repository: **Leruchii/Leruchi-internal** — GitHub currently reports this repository as public; treat this as a security blocker until an authorized administrator changes and verifies visibility.
- Public OSS Core repository: **Leruchii/Leruchi**

## Engineering rule

All new engineering work and active product references MUST use Leruchi. Legacy environment variables and filesystem paths may remain temporarily only where required for backward compatibility, and must be tracked for migration. Public brand lock, package/repository publication, and release announcements remain blocked until formal naming clearance is recorded. Coding agents must treat the GitHub topology above as authoritative and must not recreate the former VibeDB naming.

Stable internal database identifiers, migration names, historical commit references, compatibility values, or externally persisted identifiers are not renamed merely for branding; changing those requires an explicit migration decision and compatibility plan.

## Handoff rule

Every coding agent must read this file together with BUILD_PLAN.md and BUILD_STATE.md before continuing work. If any active documentation conflicts with this identity contract, update the documentation before proceeding with feature work.
