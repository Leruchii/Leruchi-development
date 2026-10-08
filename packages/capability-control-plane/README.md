# Capability Control Plane — service core (not yet production-deployed)

This package implements the issuer/revocation HTTP contract and a PostgreSQL persistence adapter. It does **not** ship a production identity provider, deployment, secret manager, network policy, migration runner or on-call operation. Do not call a deployment production-ready until those are configured and verified.

## Trust boundary

- The data plane holds only EdDSA public keys and calls the authenticated revocation endpoint. It never receives the private signing key.
- The control plane signs short-lived grants (maximum 15 minutes) using a private Ed25519 key and records every issued grant in durable storage.
- Caller identity is obtained only through the required `authenticateCaller(req)` callback. Never derive the subject or tenant membership from the grant request body or caller-controlled headers.
- `authorizeGrant(principal, request)` must consult authoritative current membership/policy and return literal `true` only when issuance is allowed.
- Revocation routes require a separate internal bearer credential and must be protected further by private networking or mTLS in deployment.
- The HTTP adapter fails closed on callback/store errors. Revocation lookup for an unknown JTI returns inactive/revoked.
- Use HTTPS outside loopback, secret-manager injection, a dedicated least-privilege PostgreSQL role, audit events, alerting, backup/recovery and a documented key-rotation procedure.

## Contract

- `POST /v1/capability-grants`: trusted authenticated caller requests a tenant-bound grant; body accepts `tenant_id`, `capabilities`, optional `scope` and `ttl_seconds`. The caller cannot choose `sub`, `jti`, `iss`, `aud`, `iat` or `exp`.
- `POST /v1/capability-grants/:jti/revoke`: internal-only, idempotent revocation.
- `GET /v1/capability-grants/:jti/revocation`: internal-only active/revoked decision for the data-plane verifier.

## Persistence

Apply `schema.sql` using a migration identity. Construct `createPostgresCapabilityStore(pool)` using a configured `pg.Pool`; keep application credentials separate from migration credentials. Restrict access to the schema and table to the service role, and retain revocation records at least until all related grants have expired and the retention policy allows cleanup.

## Required before production

1. Implement and review the identity-provider/gateway adapter for `authenticateCaller`; prove identity signature, issuer, audience, expiry and tenant membership are authoritative.
2. Implement authoritative policy for `authorizeGrant`, including destructive-operation approval and delegation limits.
3. Inject the private key from a secret manager/KMS/HSM where available; document rotation, overlap, compromise response and key IDs.
4. Deploy the service and PostgreSQL with TLS, private networking/mTLS, separate credentials, migrations, backups, restore drills, health checks, rate limits and audit logging that excludes tokens and secrets.
5. Configure data-plane issuer/public keys/revocation URL/internal token and prove network/auth failures deny requests.
6. Run adversarial tests and a staging end-to-end test through a real identity provider and database.
7. Define operational owner, availability objective, alert thresholds and incident runbook.

Node.js 24 only. The service core is implementation progress, not evidence that a production service has been deployed.
