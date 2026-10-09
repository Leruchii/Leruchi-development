# Leruchi MCP Server

The MCP gateway is an agent-native adapter over the existing Leruchi execution boundary.

## Security contract

The gateway does not accept tenant identity as a tool argument. It prefers `LERUCHI_MCP_ACCESS_TOKEN` (legacy fallback: `VIBE_MCP_ACCESS_TOKEN`), and the Graph API verifies the JWT, creates the trusted ExecutionContext, validates Query/Mutation IR, applies authorization, compiles, sets transaction-local PostgreSQL claims, and executes against AGE/RLS.

Required environment:

- `LERUCHI_API_URL` — Leruchi API base URL (legacy fallback: `VIBE_API_URL`).
- `LERUCHI_MCP_ACCESS_TOKEN` — access token representing the authenticated agent/user (legacy fallback: `VIBE_MCP_ACCESS_TOKEN`).

## Current tools

- `schema.discover`
- `graph.query`
- `graph.traverse`
- `graph.mutate`

The gateway deliberately does not expose free-form Cypher or arbitrary SQL. `sql.query` and `execution.explain` will be added only when their canonical relational execution/planning contracts exist.

## Run

Use the stdio entrypoint:

    LERUCHI_API_URL=http://127.0.0.1:4100 LERUCHI_MCP_ACCESS_TOKEN=... node packages/mcp-server/index.mjs

Agents send JSON-RPC 2.0 MCP messages over stdin/stdout.