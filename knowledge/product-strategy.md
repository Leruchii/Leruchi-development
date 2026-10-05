# VibeDB Product Strategy

Status: DECIDED — strategic direction

## Product identity
VibeDB is a developer-first database platform and safe agent-native data platform. It bridges relational, graph, and vector workloads behind common developer and agent contracts.

AI/MCP is a major differentiator, not a replacement for normal developer workflows.

## First-class interfaces
- CLI
- SDK
- REST/Graph API
- SQL/PostgreSQL-compatible workflows where supported
- Studio
- MCP/AI agents

All converge on the same authoritative IR, validation, authorization, planner, and secure execution architecture.

## OSS-first strategy
The current priority is a serious self-hostable public product. No Cloud implementation is required to complete the current OSS roadmap.

Cloud and Enterprise architecture should be designed early enough to avoid accidental coupling, but implementation is deferred until the OSS readiness gate.

## Monetization strategy
Commercial value should come from:
1. Managed infrastructure and operational convenience.
2. Collaboration and project lifecycle services.
3. Scale, reliability, regions, backups, and recovery operations.
4. Hosted agent/MCP operations and advanced agent governance.
5. Enterprise identity, compliance, networking, dedicated infrastructure, support, and SLA.

Core database concepts, IR contracts, developer tooling, and safe agent primitives remain portable.

## Product sequencing
Current: harden Core, finish agent-native context/intent/planning, improve developer experience, establish reproducible self-hosting, and build OSS readiness evidence.

Later: public OSS release, community feedback, VibeDB Cloud control plane, and Enterprise services.

## Anti-lock-in principle
Users should be able to move between self-hosted VibeDB and VibeDB Cloud without rewriting the application's fundamental data model or client integration.

## Decision rule
If a feature is fundamental to operating or developing against VibeDB as a database platform, default to OSS. If it primarily provides hosted operations, commercial governance, enterprise compliance, or managed infrastructure, default to private Cloud/Enterprise. If uncertain, mark it UNKNOWN and create an architecture decision before coding.
