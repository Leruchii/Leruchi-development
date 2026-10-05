# VibeDB Open-Source Boundary

Status: DECIDED — repository boundary contract

## Purpose
This document defines what belongs in the public VibeDB repository and what must remain in future private Cloud/Enterprise repositories.

VibeDB Core must remain independently buildable, self-hostable, and useful without access to VibeDB Cloud.

## Public repository: VibeDB Core
The public repository may contain:
- PostgreSQL, Apache AGE, and pgvector integration.
- Query IR, Mutation IR, Retrieval IR, Context IR, and future portable IR contracts.
- Validation, authorization primitives, planner/compiler contracts, and Secure Execution.
- Tenant isolation and RLS integration.
- CLI, SDKs, REST/Graph API, MCP server, and Studio/developer tooling.
- Local development and self-hosting workflows.
- Core observability and audit contracts that are part of the portable runtime.
- Tests, fixtures, migrations, examples, and public documentation.
- Portable agent safety, context, intent, evaluation, and policy primitives.
- Open protocols and integration adapters that do not require private infrastructure.

## Private Cloud repository
Future private Cloud repositories may contain:
- Cloud control-plane services.
- Managed project provisioning and lifecycle automation.
- Hosted infrastructure orchestration.
- Cloud-only autoscaling and regional placement.
- Billing, subscriptions, and commercial metering.
- Managed backup/restore orchestration and commercial disaster-recovery operations.
- Cloud account/organization control-plane services.
- Hosted MCP/agent operations that depend on private infrastructure.
- Cloud-only deployment automation and internal fleet operations.

## Private Enterprise repository or modules
Enterprise-only capabilities may include:
- SSO/SAML and SCIM control-plane integrations.
- Enterprise organization/governance workflows.
- Advanced compliance and retention controls.
- Customer-managed key orchestration.
- Private networking and dedicated infrastructure control.
- Enterprise audit/compliance operations beyond portable core contracts.
- Enterprise SLA/support systems.

The exact enterprise boundary is a future decision and must not be invented early merely to justify proprietary code.

## Hard dependency rule
VibeDB Core must never require a private Cloud or Enterprise service to install, start locally, run tests, authenticate through a supported self-hosted path, execute core database operations, use CLI/SDK/API, use MCP safely, or build an application.

Cloud and Enterprise may depend on Core. Core must not depend on Cloud or Enterprise.

## Repository hygiene
Never commit Cloud credentials, private endpoints, production secrets, customer data, billing-provider secrets, internal fleet topology, or private security-sensitive infrastructure details.

## Boundary classification
Every new component must be classified as:
- OSS_CORE — portable database/developer/agent capability.
- OSS_ADAPTER — portable integration or protocol adapter.
- CLOUD_PRIVATE — managed infrastructure/control-plane capability.
- ENTERPRISE_PRIVATE — organization/compliance/commercial capability.
- UNKNOWN — insufficient evidence; stop and record a decision before implementation.

UNKNOWN must not silently become private or public code.

## Enforcement direction
Progressively automate the boundary through documentation/architecture checks, dependency checks, secret scanning, public-repository hygiene checks, architecture regression tests, and stage exit gates.

## Release principle
Open source should be released when the OSS readiness gate is satisfied, not when Cloud is finished. A public release must leave developers with a complete, credible, self-hostable VibeDB experience.
