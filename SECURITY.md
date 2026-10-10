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

## Historical Gitleaks dispositions

The repository's full-history scan identified two historical, commit-specific findings. Their current-tree contexts were inspected before disposition:

- `cbdbdda8ffc2762337dd0d082ce9945abef8c4ab:infra/supabase/docker-compose.yml:generic-api-key:124` was a fixed local-only Supavisor `VAULT_ENC_KEY` placeholder in the original Stage 03 Compose addition. The tracked value has been removed from the current Compose file; Supavisor now requires a value supplied through an untracked local environment file. Stage 03 CI uses a clearly test-only ephemeral value.
- `d1a5a2e308e46875045ec39a15f0b1ecfd8bbdf3:tests/fixtures/capability-grant-test-key.mjs:private-key:3` was a hard-coded private key in a test-only capability-grant fixture. The current fixture generates an ephemeral Ed25519 keypair, and the fixture is referenced by test code rather than product runtime modules.

Only these exact fingerprints are ignored. The ignores are commit-specific and do not suppress new values or future findings at the same paths. The normal introduced-change scan and the full-history scan remain blocking. Never add broad rules or ignore a finding without inspecting its actual context.
