# Leruchi — Engineering Preview

Leruchi is a developer- and AI-agent-oriented data platform that brings relational SQL, graph operations, vector retrieval, realtime changes, and agent workflows behind shared validation and authorization boundaries. Leruchi Query IR is the engine-neutral contract between client intent and backend execution. Its goal is to bridge SQL-style data access and graph traversal without making clients or agents construct privileged database queries.

**Runtime: Node.js 24 only.** Node.js 20 is not supported.

## Core capabilities

- **PostgreSQL foundation:** relational persistence, migration-ledger discipline, tenant isolation, and row-level security.
- **Query IR and Mutation IR:** engine-neutral contracts validated before execution.
- **Graph and SQL execution:** controlled planning and compiler paths, including PostgreSQL recursive queries and Apache AGE integration.
- **Schema Catalog and Graph API:** consistent metadata and graph operations without asking SDKs or agents to construct privileged database queries.
- **SDK, CLI, and MCP:** developer and AI-agent interfaces that delegate to the shared validation and authorization boundary.
- **Retrieval and observability:** hybrid retrieval planning, explainability, audit events, traces, and operational visibility.
- **Realtime and recovery:** outbox-oriented graph updates plus backup/restore tooling.
- **Studio:** a web interface and browser-level tests for developer workflows.

## Architecture and security contract

Query IR expresses intent only. Schema validation, tenant authorization, cost/depth/result guardrails, planning, and engine compilation must occur behind this boundary. PostgreSQL row-level security remains authoritative for tenant isolation. MCP and the SDK are interfaces, not privileged execution paths.

## Engineering-preview status

This is an engineering preview, not a declaration of production readiness or full security compliance. Interfaces and schemas may evolve. Automated tests and the OWASP ASVS verification profile are engineering evidence, not a claim of full compliance with ASVS or any other standard.

The capability-grant and revocation service core is implemented and tested, but production identity-provider integration, authoritative tenant policy, production signing-key custody/rotation, least-privilege deployment roles, private networking or mTLS, monitoring/alerting, and staging recovery evidence must be completed before treating production authorization as deployed. These production limitations must be closed and verified in the target environment before relying on Leruchi for production workloads.

## Repository layout

- `packages/` — platform contracts, execution, agent, retrieval, and governance modules.
- `apps/studio/` — Studio application and browser tests.
- `infra/` — database migrations, PostgreSQL initialization, and Supabase compatibility configuration.
- `tests/` — regression and integration-oriented tests.
- `scripts/` — operational and release-support tooling.
- `OSS_EXPORT_MANIFEST.json` — explicit allowlist for the sanitized public source export.

The development and CI repository is [Leruchii/Leruchi-development](https://github.com/Leruchii/Leruchi-development). It holds the engineering plan, internal build-state records, CI definitions, and candidate-generation controls. It may remain public; its visibility is not a release blocker. The public-facing source destination is [Leruchii/Leruchi](https://github.com/Leruchii/Leruchi). Do not mirror the development repository wholesale into it.

## Local development

1. Install Node.js 24 and Docker Compose.
2. Review `docker-compose.yml` and `infra/supabase/docker-compose.yml` before starting local services. The root Compose file starts the database; the Supabase compatibility stack is an integration-test harness.
3. Start the local database with `docker compose up -d db`.
4. Before using the Supavisor profile, supply a fresh local-only `VAULT_ENC_KEY` through your shell environment or an untracked `.env` file. The Compose configuration intentionally fails if this value is missing. Default passwords and JWT/service secrets are public test/development placeholders only; never reuse them in shared or production environments.
5. Install root dependencies with `npm ci --ignore-scripts --no-audit --no-fund`.
6. Run the focused test files for the package or stage being changed. CI workflows under `.github/workflows/` define the authoritative stage-specific validation commands.

The database is published on loopback (`127.0.0.1:5432`) by the supplied Compose file. Do not expose this development configuration to an untrusted network.

## Public source export and dependencies

`OSS_EXPORT_MANIFEST.json` defines the allowlisted source paths used by the sanitized candidate builder. The Stage 31/32 workflows verify the export boundary, Node.js runtime policy, security checks, and repeatable archive build.

`THIRD_PARTY_NOTICES.md` inventories license metadata declared by the root and Studio npm lockfiles. It is not legal advice or a substitute for reviewing the exact release artifact, upstream license texts, attribution requirements, and compatibility of LGPL/MPL/CC-BY components.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability-reporting guidance. Never commit real credentials, tenant data, signing keys, or production configuration.
