# Security Policy

Leruchi treats tenant isolation, authorization boundaries, and credential handling as security-critical.

## Reporting a vulnerability

Please do not disclose suspected vulnerabilities in a public issue or pull request.

Use GitHub's private vulnerability reporting feature for this repository when available. If private reporting is unavailable, contact the maintainers privately through the Leruchi organization before sharing technical details. Include the affected version or commit, impact, and a minimal reproduction when safe to do so.

Do not include real customer data, production credentials, tokens, private keys, or other secrets in a report.

## Security boundaries

- PostgreSQL row-level security is authoritative for tenant isolation.
- Normal clients and AI agents must not receive unrestricted service-role credentials.
- MCP is an interface, not a privileged execution path.
- Node.js 24 is the supported runtime.
- Passing an automated security profile is not a claim of full compliance with any external standard.
