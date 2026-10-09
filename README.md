# Leruchi

Leruchi is an open-source developer platform in active development that brings relational, graph, vector, realtime, and AI-agent access together behind consistent developer and agent interfaces. The design goal is to bridge SQL-style data access and graph traversal while keeping authorization, validation, and execution behind shared contracts.

**Runtime:** Node.js 24 only. Node.js 20 is not supported.

## Core architecture

- **PostgreSQL foundation:** relational storage, migration-ledger discipline, tenant isolation, and row-level security.
- **Query IR and Mutation IR:** engine-neutral contracts validated before execution.
- **Execution and compilers:** PostgreSQL recursive-query and Apache AGE graph paths behind controlled execution interfaces.
- **Schema Catalog and Graph API:** consistent metadata and graph operations without asking SDKs or agents to construct privileged database queries.
- **SDK, CLI, and MCP:** developer and AI-agent interfaces that delegate to the shared validation and authorization boundary.
- **Retrieval and observability:** hybrid retrieval planning, explainability, audit events, traces, and operational visibility.
- **Realtime and recovery:** outbox-oriented graph updates plus backup/restore tooling.

## Development status

This repository is an engineering preview, not a declaration of production readiness. Interfaces and schemas may evolve. Automated tests and the OWASP ASVS verification profile are engineering evidence, not a claim of full compliance with ASVS or any other standard.

In particular, the capability-grant and revocation service core is implemented and tested, but production identity-provider integration, authoritative tenant policy, production signing-key custody/rotation, least-privilege deployment roles, private networking or mTLS, monitoring/alerting, and staging recovery evidence must be completed before treating production authorization as deployed.

## Local development

1. Install Node.js 24 and Docker Compose.
2. Review `docker-compose.yml` before starting local services. Its default credentials are for local development only and must never be reused in a shared or production environment.
3. Start the local database with `docker compose up -d db`.
4. Install root dependencies with `npm ci --ignore-scripts`.
5. Run the focused test files for the package or stage being changed. CI workflows under `.github/workflows/` define the authoritative stage-specific validation commands.

The database is published on loopback (`127.0.0.1:5432`) by the supplied compose file. Do not expose this development configuration to an untrusted network.

## Public source export and dependencies

`OSS_EXPORT_MANIFEST.json` defines the allowlisted source paths used by the sanitized candidate builder. The Stage 31/32 workflows verify the export boundary, Node.js runtime policy, security checks, and repeatable archive build.

`THIRD_PARTY_NOTICES.md` inventories license metadata declared by the root and Studio npm lockfiles. It is not legal advice or a substitute for reviewing the exact release artifact, upstream license texts, attribution requirements, and compatibility of LGPL/MPL/CC-BY components.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability-reporting guidance. Never commit real credentials, tenant data, signing keys, or production configuration. MCP and the SDK are interfaces, not privileged execution paths; tenant isolation and server-side authorization must remain authoritative.
