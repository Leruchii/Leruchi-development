# Leruchi
Leruchi is a secure developer platform that makes relational, graph, vector, realtime, and AI agent access feel like one database.

## License

Leruchi Core is released under the Apache License 2.0. See [LICENSE](LICENSE) for the full license text.


## Agent authorization

Self-hosted deployments using MCP/agent capabilities must configure an EdDSA-signed capability authority and fail-closed revocation endpoint. The OSS runtime includes the verifier and adapter, not a production issuer. See [Self-hosted agent capability authorization](docs/security/capability-grants.md) for the token contract, configuration, key rotation, and revocation requirements.
