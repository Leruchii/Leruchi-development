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
- [VALIDATED] Stage 14 currently exposes `schema.discover`, `graph.query`, `graph.traverse`, `graph.mutate`, and `retrieval.query`; live governance evidence must continue to be treated as the implementation authority.
- [UNKNOWN] Long-lived capability issuance/revocation and hosted human-approval UX remain control-plane/product work until executable evidence exists.
