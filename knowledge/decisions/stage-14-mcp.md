# Stage 14 MCP Governance Decisions

Status: CORE CONTRACT VALIDATED — CONTROL-PLANE GRANT REVOCATION NOT YET INTEGRATED

## Scope

Stage 14 is the agent-native gateway over the canonical Leruchi ExecutionContext, Schema Catalog, Query IR and Mutation IR. MCP is an adapter, not a second execution engine.

## Scoped capability grants

Capability issuance belongs to a future authorization/control plane. The data plane does not mint or persist authorization state.

A scoped capability grant is expected to contain:
- `jti` for revocation;
- `tenant_id` binding;
- canonical capability names;
- `aud=leruchi`;
- `exp` and optional `nbf`;
- optional scope metadata.

The data plane validates the grant and can call an injected revocation verifier keyed by `jti`. This keeps cloud/control-plane topology separate from the core execution contract.

## Destructive agent operations

Normal mutation capability and destructive approval are separate controls.

- `graph:write` authorizes mutation generally.
- `graph:delete` is required for delete operations.
- Delete operations additionally require an explicit approval artifact.
- The approval is tenant scoped, time bounded, and bound to a SHA-256 digest of the exact Mutation IR plus request parameters.
- Approval verification is delegated to an injected control-plane verifier.
- If no verifier is configured, destructive execution fails closed.
- Preview mode validates the Mutation IR and returns bounded impact metadata without beginning a database transaction.

The approval artifact is intentionally not treated as a substitute for authentication, tenant context, RLS, or capability checks.

## Structured audit

The Graph API exposes an optional audit sink. Audit events are generated after authentication/context derivation and include:
- request ID;
- tenant ID;
- actor role;
- capabilities;
- route;
- MCP tool when present;
- operation;
- graph;
- outcome;
- error code;
- approval ID.

Audit events intentionally exclude JWTs, secrets, raw query text and raw request parameter values.

Audit delivery must not change the authorization decision or leak sensitive error content.

## MCP contract

`graph.mutate` accepts:
- canonical Mutation IR;
- parameters;
- optional execution mode (`preview` or `execute`);
- optional closed approval artifact.

Tenant identity is never accepted as tool input.

## Validation gate

Stage 14 may only become VALIDATED after:
- MCP contract tests pass;
- scoped capability grant tests pass;
- destructive approval/preview tests pass;
- audit contract tests pass;
- live MCP → Graph API → PostgreSQL/AGE/RLS integration passes;
- architecture regression audit passes.


## Stage 32 route authorization hardening — pending CI

The Graph API route boundary is being hardened so that:
- `POST /v1/graph/query` requires `graph:read` before catalog or database access.
- `POST /v1/graph/mutations` requires `graph:write`.
- Destructive delete mutations additionally require `graph:delete`.
- Denials are audited with `CAPABILITY_DENIED` and occur before catalog/database access.

The scoped capability grant validator and revocation helper are not yet wired to a production control-plane verifier. Treat this as an explicit follow-up security gate.


## Stage 32 capability-grant enforcement candidate — 2026-10-08

Candidate change: Graph API strict grant mode validates the signed bearer claims as a control-plane grant, requires canonical capabilities, tenant binding, audience and expiry, enforces optional route/graph scope, and checks jti revocation through an authenticated external control-plane adapter. The adapter requires an explicit active/revoked response, enforces HTTPS outside loopback, and fails closed on malformed, inactive, timed-out or unavailable decisions. The production launcher enables strict mode and requires issuer/control-plane configuration.

Stage 14 CI now starts a dedicated test-only control-plane stub and exercises the production adapter path. This verifies integration mechanics, not production control-plane deployment. The real issuer/revocation service, key rotation, tenant-aware issuance, revocation latency/SLA and production integration remain release blockers. This candidate has not run CI yet; record exact-head results before advancing.


## Stage 13 workflow strict-grant fixture fix candidate — 2026-10-08

Candidate `2ae9de766bc31a9542c4e782170b0834857d69cb` updates Stage 13 to start the test-only control-plane stub and configure strict capability-grant verification in the Graph API launcher. This addresses the confirmed prior failure where the launcher exited for missing `LERUCHI_CAPABILITY_ISSUER`. Candidate has not run CI. Production control-plane deployment remains a release blocker.


## Asymmetric grant signing boundary — candidate, 2026-10-08

Strict Graph API grant verification is moving to EdDSA JWTs with kid-selected public keys. The data plane will hold only a public-key ring; the private signing keys stay in the separate control plane. Key rotation supports overlapping key IDs. CI uses a clearly test-only private key fixture and does not establish a production issuer. Production key custody, rotation, membership-aware grant issuance and revocation operations remain release gates. Candidate has not run CI.


## EdDSA test-key hygiene fix candidate — 2026-10-08

The Stage 32 ASVS gate rejected the previous candidate because a test-only PEM private key was embedded in source. The candidate replaces it with an ephemeral keypair generated in CI, passes only the public key to the Graph API, and keeps the private test key in runner temporary storage. No private key is committed. Production private-key custody and rotation remain release gates. Candidate has not run CI.


## Live revocation integration candidate — 2026-10-08

The next candidate adds a live MCP-to-Graph API test using a grant jti configured as revoked in the test control-plane stub. The test asserts the Graph API denies the grant through the HTTP revocation adapter. The production control plane is still not implemented/deployed in OSS; the stub validates only the interface contract. Candidate has not run CI.


## Self-hosted capability authority documentation candidate — 2026-10-08

Adds a public guide describing the external EdDSA grant issuer and revocation endpoint contract, strict-mode environment, key rotation, fail-closed behavior, membership-aware issuance obligations and deployment checklist. It explicitly states that the OSS runtime contains a verifier/adapter, not a production issuer, and that self-hosted/third-party authority is supported without Leruchi Cloud. The guide is eligible for export under docs/**. Candidate has not run CI.
