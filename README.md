# Leruchi
Leruchi is a secure developer platform that makes relational, graph, vector, realtime, and AI agent access feel like one database.

## License

Leruchi Core is released under the Apache License 2.0. See [LICENSE](LICENSE) for the full license text.


## Local development security

The Docker Compose stacks and their compatibility credentials are for local development and CI only. Published database, Auth, and PostgREST ports are bound to `127.0.0.1` to avoid exposing these development services to the network. Do not reuse the sample credentials or local JWT secrets in production; production deployments must provision unique secrets, restrict network access, and follow the deployment security guidance.

## Agent authorization

Self-hosted deployments using MCP/agent capabilities must configure an EdDSA-signed capability authority and fail-closed revocation endpoint. The OSS runtime includes the verifier and adapter, not a production issuer. See [Self-hosted agent capability authorization](docs/security/capability-grants.md) for the token contract, configuration, key rotation, and revocation requirements.
