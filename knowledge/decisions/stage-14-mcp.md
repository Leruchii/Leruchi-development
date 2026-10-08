# Stage 14 MCP Governance Decisions

Status: IMPLEMENTED — NOT YET VALIDATED

## Scope

Stage 14 is the agent-native gateway over the canonical Leruchi ExecutionContext, Schema Catalog, Query IR and Mutation IR. MCP is an adapter, not a second execution engine.

## Scoped capability grants

Capability issuance belongs to a future authorization/control plane. The data plane does not mint or persist authorization state.

A scoped capability grant is expected to contain:
- `jti` for revocation;
- `tenant_id` binding;
- canonical capability names;
- `aud=vibedb` (legacy protocol audience; migrate separately with issuer/verifier/versioned-token coordination);
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
