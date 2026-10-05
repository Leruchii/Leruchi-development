# Stage 26A — OSS Product & Cloud Boundary

Status: DECIDED — boundary foundation

## Decision
VibeDB will be built OSS-first. The public repository contains VibeDB Core and portable developer/agent capabilities. Future VibeDB Cloud and Enterprise implementation will live outside the public core repository.

## Why
VibeDB needs community trust, developer adoption, self-hosting, and a credible open-source product while retaining a commercial path through managed operations and enterprise services.

Keeping the boundary explicit now prevents Cloud dependencies from leaking into Core and prevents roadmap drift toward a hosted-only product.

## Consequences
Positive:
- Developers can inspect and self-host Core.
- CLI/SDK/API/MCP remain portable.
- Cloud can consume the same Core contracts.
- Future private repositories can evolve without rewriting the core architecture.
- CI can enforce dependency direction.

Tradeoffs:
- Cloud functionality needs clean adapter/control-plane interfaces.
- Ambiguous components must be classified before implementation.
- Cloud and Enterprise work are intentionally deferred.

## Repository model
Current public repository:
- Fikunmii/vibeDB — VibeDB Core.

Future private repositories, names illustrative and not yet created:
- vibedb-cloud — Cloud control plane and managed operations.
- vibedb-enterprise — Enterprise-only services if separate ownership is useful.

Do not create these private repositories until the OSS readiness gate and a concrete Cloud implementation require them.

## Dependency direction
Allowed:
VibeDB Cloud → VibeDB Core

Not allowed:
VibeDB Core → VibeDB Cloud
VibeDB Core → Enterprise-only service

Cloud-specific functionality integrates through stable Core APIs/contracts or explicitly defined adapters.

## Scope classification
Use:
- OSS_CORE
- OSS_ADAPTER
- CLOUD_PRIVATE
- ENTERPRISE_PRIVATE
- UNKNOWN

UNKNOWN requires a decision before coding.

## Open-source readiness
A later dedicated stage will define and prove the release gate. It must include executable CI evidence, security/regression evidence, self-hosting/developer installation evidence, documentation completeness, and supported-version policy.

## Non-goal
This decision does not define final Cloud features, pricing, licensing, or enterprise packaging. Those require later decisions and evidence.
