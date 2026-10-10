# Leruchi Product Identity

Status: APPROVED — canonical public product name: LERUCHI (owner-confirmed 2026-10-10).

Leruchi is the official product name. **VibeDB is the former product name and must not be reintroduced as current product-facing branding. Legacy technical identifiers may remain where changing them would break compatibility; each must be tracked for controlled migration.** The owner confirms legal and release approval has been obtained for the intended product identity and distribution scope. Preserve the underlying approval record in the organization's approved records; do not invent reviewer details or a record URL.

## Canonical GitHub topology

- Enterprise/product: **Leruchi**
- GitHub organization: **Leruchii**
- Intended private development repository: **Leruchii/Leruchi-development** — GitHub currently reports this repository as public; treat this as a security blocker until an authorized administrator changes and verifies visibility.
- Intended private internal control repository: **Leruchii/Leruchi-internal** — GitHub currently reports this repository as public; treat this as a security blocker until an authorized administrator changes and verifies visibility.
- Public OSS Core repository: **Leruchii/Leruchi**

## Engineering rule

All new engineering work, UI copy, documentation, package metadata, CLI documentation, MCP metadata and user-facing product references MUST use Leruchi. Public-facing naming must use Leruchi. Release announcements must describe the approved scope and must not imply production readiness until production gates are verified. Legacy environment variables, config paths, protocol audiences and filesystem paths must be migrated through tested compatibility steps, not blind global replacement. Coding agents must treat the GitHub topology above as authoritative and must not recreate the former VibeDB naming.

Stable internal database identifiers, migration names, historical commit references, compatibility values, or externally persisted identifiers are not renamed merely for branding; changing those requires an explicit migration decision and compatibility plan.

## Handoff rule

Every coding agent must read this file together with BUILD_PLAN.md and BUILD_STATE.md before continuing work. If any active documentation conflicts with this identity contract, update the documentation before proceeding with feature work.
