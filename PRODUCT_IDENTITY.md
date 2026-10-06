# Leruchi Product Identity

Status: DECIDED — canonical product identity

Leruchi is the current and only product name. **VibeDB is the former product name and must not be used as a current product, repository, organization, package, CLI, documentation, or architectural identity.** Historical references may remain only when explicitly documenting migration history.

## Canonical GitHub topology

- Enterprise/product: **Leruchi**
- GitHub organization: **Leruchii**
- Private development repository: **Leruchii/Leruchi-development**
- Private internal control repository: **Leruchii/Leruchi-internal**
- Public OSS Core repository: **Leruchii/Leruchi**

## Engineering rule

All new work, documentation, agent instructions, architecture decisions, build state, release plans, examples, workflows and user-facing surfaces MUST use Leruchi. Coding agents must treat the GitHub topology above as authoritative and must not recreate the former VibeDB naming.

Stable internal database identifiers, migration names, historical commit references, compatibility values, or externally persisted identifiers are not renamed merely for branding; changing those requires an explicit migration decision and compatibility plan.

## Handoff rule

Every coding agent must read this file together with BUILD_PLAN.md and BUILD_STATE.md before continuing work. If any active documentation conflicts with this identity contract, update the documentation before proceeding with feature work.
