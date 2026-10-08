# MCP

## Product contract

- [DECIDED] MCP is bidirectional: it supports both authenticated read/retrieval requests and authorized write/action requests on behalf of a human.
- [DECIDED] MCP is an interface into Leruchi, never a privileged database execution boundary.
- [DECIDED] MCP and SDK/API clients converge on the same Query IR / Mutation IR, validation, capability, RLS and execution boundaries.
- [DECIDED] Tenant identity is derived from trusted authentication context and cannot be supplied as a tool argument.
- [DECIDED] AI/MCP access uses scoped capabilities, never unrestricted `service_role`.
- [DECIDED] Destructive or high-impact agent mutations require explicit preview/dry-run, impact/diff review, approval and audit semantics.
- [DECIDED] Developers are a first-class product audience. SDK, REST/Graph API, SQL/PostgreSQL compatibility, CLI and Studio must remain comfortable without requiring knowledge of MCP, AGE, planners or compilers.
- [DECIDED] Agent actions must preserve the same tenant isolation and PostgreSQL/RLS guarantees as direct developer requests.
- [VALIDATED] The MCP server currently exposes `schema.discover`, `graph.query`, `graph.traverse`, `graph.mutate`, `retrieval.explain`, `retrieval.query`, `context.explain`, `context.resolve`, `agent.intent.explain`, `agent.plan.explain`, `agent.evaluate`, `agent.trace`, and `agent.replay`.
- [VALIDATED] The Graph API must enforce capabilities at the data-plane route boundary: graph queries require `graph:read`; mutations require `graph:write`; destructive deletes additionally require `graph:delete`. MCP annotations and tool names are descriptive metadata, not authorization.
- [UNKNOWN] Long-lived capability issuance/revocation and hosted human-approval UX remain control-plane/product work until executable evidence exists.


## Stage 32 security validation checkpoint

The self-hosted Supabase Auth custom access-token hook has an end-to-end Stage 03 test. It verifies an active membership produces the expected top-level tenant claim, a revoked tenant selector omits the claim, and PostgREST RLS returns no cross-tenant rows. This is test-environment evidence; production hook deployment and membership provisioning still require validation.

Scoped capability grant helpers exist, but integration with a production control-plane issuer and live revocation lookup remains unimplemented. Do not describe grant revocation as enforced until the Graph API consumes a signed grant and a mandatory revocation decision.
