# Bidirectional MCP + Developer-First Contract

## Status

DECIDED — durable product and architecture priority.

## Decision

Leruchi has two first-class audiences:

- developers using SDK, REST/Graph API, SQL/PostgreSQL compatibility, CLI and Studio;
- AI agents operating through MCP on behalf of an authenticated human or trusted application.

MCP must support both:

- reads/retrieval;
- authorized writes/actions such as create, update and delete records or relationships.

The second capability does **not** create a privileged database path. Agent requests use the same trusted identity, tenant isolation, scoped capabilities, Schema Catalog validation, Query/Mutation IR, guardrails, Secure Execution Engine and PostgreSQL/RLS boundary as developer requests.

Destructive or high-impact actions require explicit preview/impact/approval/audit semantics.

## Developer ergonomics

A developer should be able to express intent without understanding Apache AGE, Cypher, planner internals, recursive CTEs or MCP. Internal engine selection remains behind Vibe contracts.

## Architectural invariant

```
Developer / Agent
       ↓
 Query IR / Mutation IR
       ↓
identity + capability + validation
       ↓
approval / safety policy
       ↓
planner + compiler
       ↓
Secure Execution Engine
       ↓
PostgreSQL / AGE / pgvector / RLS
```

No future implementation may introduce an MCP-only authorization path or an agent-only database language without a new architecture decision.
