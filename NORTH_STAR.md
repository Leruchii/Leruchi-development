# VibeDB North Star

Status: DECIDED — product and architecture guardrail

## What VibeDB is
VibeDB is a developer-first data platform that makes relational, graph, vector, and AI-agent access feel like one coherent database.

VibeDB has two first-class audiences: developers using CLI, SDK, REST/API, SQL/PostgreSQL workflows and Studio; and AI agents using MCP and agent-facing APIs. AI is an interface and capability, not the definition of VibeDB.

## Core product promise
A developer or agent expresses intent once. VibeDB validates that intent against trusted identity, capabilities, schema, limits, and policy; chooses a safe execution target; and executes through one authoritative security boundary.

CLI / SDK / REST / Studio / MCP / AI Agent
→ engine-neutral IR
→ validation + authorization
→ planner
→ secure execution
→ SQL / Graph / Vector

## Developer-first rule
VibeDB must remain useful without AI, MCP, or natural-language interfaces. Developers must not need to understand MCP, planners, compilers, Apache AGE, or internal cloud services to use the core product.

## Open-source-first strategy
VibeDB Core is the open-source, self-hostable product/runtime. The immediate build priority is VibeDB Core and its developer/agent capabilities. Cloud and Enterprise implementation are deferred until the OSS readiness gate is satisfied.

The OSS product must be genuinely useful on its own. Cloud must not be required to understand, run, develop against, or own data in VibeDB Core.

## Commercial strategy
VibeDB Cloud and Enterprise monetize operational and organizational value around the core: managed infrastructure, provisioning, scaling, backups, regions, collaboration, governance, hosted agent operations, enterprise identity, compliance, private networking, dedicated infrastructure, SLA and support.

Commercial features consume and extend Core rather than making Core depend on private services.

## What VibeDB will not become
- An AI-only or natural-language-only database.
- A hosted-only proprietary database.
- A collection of parallel execution paths for different clients.
- A product where MCP receives privileged database access.
- A product where Cloud dependencies leak into the self-hostable core.
- A product whose OSS edition is intentionally crippled to force Cloud adoption.

## Strategic sequence
1. Build and harden VibeDB Core.
2. Establish OSS readiness and release a credible self-hostable developer product.
3. Learn from real developer adoption.
4. Build VibeDB Cloud around managed operations and differentiated commercial services.
5. Add Enterprise capabilities where organizational, governance, security, compliance, and support requirements justify them.

## Future-work decision rule
Ask:
1. Does this strengthen the self-hostable core?
2. Is it a developer or agent capability that should remain portable?
3. Does it require private infrastructure, billing, hosted operations, or enterprise governance?
4. Can Cloud consume the core without Core depending on Cloud?

If a feature is fundamental to using VibeDB as a database platform, prefer OSS. If it is primarily managed operational infrastructure or enterprise service value, it belongs in the private commercial layer.

See OSS_BOUNDARY.md for the repository boundary and BUILD_PLAN.md for stage order.
