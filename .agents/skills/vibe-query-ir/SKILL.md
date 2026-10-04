---
name: vibe-query-ir
description: Define and evolve VibePlatform's versioned, engine-neutral Query IR without leaking AGE, Cypher or SQL into the public contract.
---

# Vibe Query IR Skill

The Query IR is the stable boundary between client intent and execution engines.

## Rules

- IR is versioned.
- IR is engine-neutral.
- No Cypher, SQL, AGE function calls, SQL fragments or executable strings.
- Identifiers are declarative references; schema authorization happens later.
- Query IR represents intent, not authorization.
- Query IR validation is separate from cost/security validation.
- Arrays have semantic order where order matters.
- Objects must have deterministic canonical serialization.
- New fields require an IR versioning decision.
- Unknown fields are rejected by the contract.
- Engine-specific compiler details belong after the IR boundary.

## Required v1 concepts

- graph traversal;
- direction;
- labels and edge types;
- filters;
- projections;
- ordering;
- limit/offset;
- depth;
- typed parameters;
- structured errors.

## Workflow

1. Read AGENTS.md, architecture, database, security and Schema Catalog knowledge.
2. Define the smallest stable IR.
3. Add JSON Schema and representative fixtures.
4. Add deterministic canonicalization reference behavior.
5. Add negative fixtures for engine leakage and malformed IR.
6. Add executable tests.
7. Update knowledge only with evidence.

## Do not implement

Query validation/cost guardrails, AGE compilation, Graph API, SDK, CLI, Studio, MCP, GraphRAG or mutations.
