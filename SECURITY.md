# Security

VibeDB Core treats PostgreSQL/RLS as the authoritative tenant security boundary.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in public issues. Use the repository's private security reporting mechanism on GitHub when available, or contact the maintainers privately through the project organization.

When reporting, include:
- affected component/version or commit;
- reproduction steps;
- security impact;
- relevant logs or proof of concept, with secrets and customer data removed.

## Security principles

- Tenant identity is trusted execution context, not client-controlled IR data.
- AI/MCP tools are interfaces, not privileged authorities.
- `service_role` must not be exposed to normal clients or AI agents.
- Destructive agent actions require explicit approval semantics and auditability.
- Diagnostic and replay paths must remain non-executing.
- Sensitive credentials, bindings, tenant identifiers and private engine fragments must not be emitted into telemetry or traces.

For urgent issues, avoid public disclosure until a maintainer has had an opportunity to assess and remediate the issue.
