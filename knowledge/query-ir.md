# Query IR

- [DECIDED] Vibe Query IR is the central abstraction between Graph API and AGE.
- [DECIDED] Clients send a structured traversal specification; the backend owns compilation and security validation. Normal users never get a free-text Cypher editor.
- [DECIDED] Pipeline: validation → planner → compiler → secure execution.
- [PROPOSED] Traversal specification fields seen in the Traversal Builder: start node, edge, direction, depth range, target label. The compiled query and JSON spec are shown read-only.
- [UNKNOWN] IR schema, versioning, supported operations, limits.
- [UNKNOWN] Planner behaviour and when the recursive-CTE fallback is chosen.
- [UNKNOWN] Mutation representation (Prompt 09).
