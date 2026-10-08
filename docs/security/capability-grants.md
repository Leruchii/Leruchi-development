# Self-hosted agent capability authorization

Leruchi's Graph API and MCP gateway use signed, tenant-bound capability grants. The OSS runtime includes the EdDSA verifier and revocation HTTP adapter; **it does not ship a production grant issuer or revocation database service**. Self-hosted deployments must configure an authorization authority that they operate or trust. This does not require Leruchi Cloud, and the managed Cloud Control Plane remains a separate, deferred product stage.

## Required grant contract

The authority issues a JWT signed with EdDSA. The data plane receives public keys only and rejects HMAC/HS256 grants in strict mode.

Required JOSE header:
- `alg=EdDSA`
- `typ=JWT`
- `kid` naming a configured public key

Required claims:
- `iss`: exact trusted authority issuer;
- `sub`: actor/user identifier for authorization and audit;
- `jti`: unique grant identifier used for revocation;
- `tenant_id`: tenant derived from authoritative membership, never from an untrusted request field;
- `capabilities`: non-empty list from the canonical Leruchi capability vocabulary;
- `aud=leruchi`;
- `exp`: integer expiry timestamp.

Optional claims:
- `nbf`: integer not-before timestamp;
- `scope.routes`: non-empty list of exact API paths this grant may access;
- `scope.graphs`: non-empty list of graph names this grant may access.

Grant issuance must apply least privilege and bind actor, tenant membership, capabilities and scope from trusted policy. User-editable metadata may be a selector only; it is not authorization evidence. Grants should be short-lived, uniquely identified, audited, and revocable.

## Revocation endpoint contract

Configure the Graph API to call:

`GET /v1/capability-grants/{jti}/revocation`

The request uses the configured bearer credential. A successful active grant response is:

```json
{"active":true,"revoked":false}
```

A revoked/inactive grant response is:

```json
{"active":false,"revoked":true}
```

Both fields must be booleans. The adapter treats inactive as revoked. Non-2xx responses, malformed payloads, timeouts, authentication errors and network failures fail closed; the Graph API denies the request rather than continuing without a revocation decision. The endpoint must be protected from normal client access and exposed over HTTPS outside loopback.

## Graph API configuration

- `LERUCHI_CAPABILITY_ISSUER`: exact `iss` value accepted from the authority.
- `LERUCHI_CAPABILITY_PUBLIC_KEYS`: JSON map from `kid` to base64-encoded DER SubjectPublicKeyInfo public key.
- `LERUCHI_CAPABILITY_CONTROL_PLANE_URL`: base URL of the revocation endpoint service.
- `LERUCHI_CAPABILITY_CONTROL_PLANE_TOKEN`: credential for the data-plane revocation lookup.

The corresponding private signing keys must stay in the authority's secret-management system. During rotation, publish both current and previous public keys and sign new grants with the new `kid`; remove the previous key only after grants signed by it have expired or been revoked. Never distribute private signing keys to Graph API, MCP, Studio, SDKs or browsers.

## Deployment checklist

- Validate the Supabase/Auth identity and tenant membership before issuing a grant.
- Bind the grant's `sub` and `tenant_id` to trusted identity, not client-supplied tenant fields.
- Allow only canonical capabilities; require `graph:delete` in addition to `graph:write` for destructive graph operations.
- Keep grants short-lived and maintain a durable revocation registry keyed by `jti`.
- Authenticate and rate-limit issuance/revocation administration endpoints.
- Audit grant issuance, revocation, rejected signatures, and failed revocation checks without logging tokens or private keys.
- Monitor control-plane availability and revocation lookup latency; the API intentionally fails closed when a decision cannot be obtained.
- Keep the issuer private key outside the data plane and document key backup/rotation/revocation procedures.
- Test active, revoked, expired, wrong-issuer, wrong-audience, unknown-key, wrong-tenant and unavailable-authority cases before production use.

The repository's CI uses ephemeral Ed25519 test keys and a test-only control-plane stub. That proves the verifier/adapter contract; it is not a production issuer, durable revocation service, or managed-service SLA.


## Control-plane implementation status

The candidate now contains an issuer/revocation service core under `packages/capability-control-plane/` and a PostgreSQL store adapter/schema. It requires injected trusted caller authentication and authoritative grant policy callbacks, and signs short-lived EdDSA grants. The service core is tested with fake identity/store adapters; those tests do not prove the production adapters or service have been deployed.

Do not deploy with test callbacks or sample keys. Before production, wire a real identity provider/gateway, membership-aware policy, secret-manager-held private key, least-privilege PostgreSQL role, private networking/mTLS, audit/alerting, key rotation and staging end-to-end tests. Keep the private signing authority out of the OSS data-plane export. See [the service README](../../packages/capability-control-plane/README.md) and [the integration review](../../knowledge/decisions/integration-review-stage32.md).
