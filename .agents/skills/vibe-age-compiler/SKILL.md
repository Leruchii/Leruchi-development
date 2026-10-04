---
name: vibe-age-compiler
description: Compile validated Vibe Query IR into safe Apache AGE prepared-statement SQL without exposing Cypher as a public client contract.
---

# Vibe AGE Compiler Skill

AGE is an execution implementation detail.

## Rules

- Input is validated Vibe Query IR.
- Compiler must defensively validate identifiers again.
- Never interpolate user-controlled filter values into Cypher.
- Use AGE Cypher parameters and a PostgreSQL prepared-statement parameter map.
- Graph names are validated identifiers and emitted as SQL string literals.
- Labels, edge types and property paths must pass strict identifier validation.
- Numeric limits are emitted only from validated numeric IR fields.
- No arbitrary Cypher/SQL fragments are accepted.
- Output columns must be deterministic.
- Compiler output is not execution authorization.

## v1 compilation

Compile graph_query into:

SELECT * FROM cypher(graph, dollar_quoted_cypher, $1) AS (... agtype columns...);

The caller supplies the agtype parameter map when preparing/executing the statement.

Literal filter values are converted into generated named Cypher parameters and returned in a binding map. Declared IR parameters remain request-bound.

## Do not implement

Secure execution engine, Graph API, SDK, CLI, Graph Studio, MCP, GraphRAG or mutations.
