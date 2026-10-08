# Capability grants

The Graph API strict-grant path accepts control-plane-signed EdDSA JWTs only. The OSS data plane stores public keys only; the corresponding private signing keys belong to the separate control plane and must never be shipped with the runtime.

Required signed claims: `iss`, `sub`, `jti`, `tenant_id`, `capabilities`, `aud=leruchi`, and `exp`. Optional `nbf` and `scope` are validated. The JOSE header must use `alg=EdDSA`, `typ=JWT`, and a `kid` present in the configured public-key ring. Unknown key IDs, invalid signatures, wrong issuer/audience, expired grants and malformed scopes are rejected.

Configure the production Graph API with:
- `LERUCHI_CAPABILITY_ISSUER`: the trusted control-plane issuer;
- `LERUCHI_CAPABILITY_PUBLIC_KEYS`: JSON object mapping each active/overlap `kid` to base64-encoded DER SubjectPublicKeyInfo;
- `LERUCHI_CAPABILITY_CONTROL_PLANE_URL` and `LERUCHI_CAPABILITY_CONTROL_PLANE_TOKEN`: authenticated revocation decision endpoint.

Keep the current and previous public keys during rotation until all grants signed by the old key have expired. The control-plane private keys must be held in its secret-management system and rotated independently from data-plane deployments. Revocation lookup is mandatory and fail-closed; an unavailable or malformed decision must not permit database access.

The repository's key fixture and control-plane stub are test-only and are not production credentials or an issuance service. The real issuer, private-key lifecycle, membership-aware issuance policy, and operational revocation SLO remain outside the OSS runtime and are release gates.
