# Build Prompt 05 — Vibe Query IR

## Mission

Define a versioned, engine-neutral representation of graph query intent.

## Required reading

- AGENTS.md
- knowledge/architecture.md
- knowledge/database.md
- knowledge/security.md
- knowledge/testing.md
- knowledge/decisions/unknowns-and-contradictions.md
- .agents/skills/vibe-postgres/SKILL.md
- .agents/skills/vibe-age/SKILL.md
- .agents/skills/vibe-schema-catalog/SKILL.md
- .agents/skills/vibe-query-ir/SKILL.md

## Required v1 contract

Represent:

- graph name;
- root label and alias;
- traversal steps;
- edge direction;
- target label and alias;
- filters;
- projections;
- ordering;
- limit and offset;
- depth;
- typed parameter declarations;
- structured errors.

## Security boundary

The IR expresses intent only.

It must not contain raw SQL, Cypher, AGE expressions, arbitrary executable predicates or service credentials.

Schema/tenant/capability authorization belongs to later validation and execution stages.

## Determinism

Provide a canonical serialization rule and golden fixtures with stable SHA-256 digests.

Canonicalization must sort object keys recursively, preserve array order, and emit compact UTF-8 JSON.

## Do not implement

Query guardrails, compiler, Graph API, SDK, CLI, Graph Studio, MCP, GraphRAG or graph mutations.

## Exit gate

Executable tests prove:

- valid representative IR fixtures conform to the v1 structure;
- malformed IR is rejected;
- engine-specific strings are rejected;
- canonical serialization is deterministic;
- golden hashes remain stable;
- structured errors are versioned.

Report changes, tests, decisions, security implications, UNKNOWNs and next stage.
