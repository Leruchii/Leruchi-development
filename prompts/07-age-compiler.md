# Build Prompt 07 — Apache AGE Compiler

## Mission

Compile validated Vibe Query IR v1 into safe Apache AGE prepared-statement SQL.

## Required reading

- AGENTS.md
- knowledge/architecture.md
- knowledge/database.md
- knowledge/security.md
- knowledge/testing.md
- knowledge/decisions/unknowns-and-contradictions.md
- .agents/skills/vibe-age/SKILL.md
- .agents/skills/vibe-query-ir/SKILL.md
- .agents/skills/vibe-schema-catalog/SKILL.md
- .agents/skills/vibe-query-validation/SKILL.md
- .agents/skills/vibe-age-compiler/SKILL.md

## Scope

Compile only read-only graph_query IR.

Support:

- root node;
- ordered traversals;
- out/in/both edge direction;
- filters;
- projections;
- ordering;
- limit/offset;
- depth metadata;
- typed parameter references.

## Safety

- no raw Cypher input;
- no SQL fragments;
- no value interpolation;
- identifiers must be validated;
- filter literals must become bound AGE parameters;
- declared IR parameters remain caller-bound;
- deterministic output columns;
- deterministic SQL/Cypher text.

## Exit gate

Tests must prove:

- representative IR compiles;
- one-hop AGE query executes against the Stage 01 graph;
- filter values are bound rather than interpolated;
- malicious string values cannot alter generated Cypher;
- invalid identifiers are rejected;
- output columns are deterministic;
- generated SQL uses the AGE prepared-statement parameter-map form.

Do not implement Graph API or execution engine.
