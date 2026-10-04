# Build Prompt 06 — Query Validation + Cost Guardrails

## Mission
Create the pre-execution validation engine for Vibe Query IR.

## Required reading
- AGENTS.md
- knowledge/architecture.md
- knowledge/database.md
- knowledge/security.md
- knowledge/testing.md
- knowledge/decisions/unknowns-and-contradictions.md
- .agents/skills/vibe-query-ir/SKILL.md
- .agents/skills/vibe-schema-catalog/SKILL.md
- .agents/skills/vibe-security/SKILL.md
- .agents/skills/vibe-query-validation/SKILL.md

## Scope
Validate, but do not execute:
1. IR version/kind and structure.
2. Graph, label and edge references against Schema Catalog input.
3. Edge direction and target-label compatibility.
4. Trusted tenant context.
5. Capability requirements.
6. service_role restrictions.
7. Parameter declarations/references.
8. Maximum depth.
9. Maximum results.
10. Deterministic query cost.

## Guardrails
- max depth 6;
- max results 1000;
- max cost 100.

## Security
The validator must never infer tenant authorization from IR content. Tenant context comes from the trusted authentication boundary established in Stage 03.

## Do not implement
AGE compiler, SQL compiler, Graph API, SDK, CLI, Studio, MCP, GraphRAG or mutations.

## Exit gate
Tests must prove valid acceptance, missing tenant/capability rejection, unknown graph/label/edge rejection, incompatible traversal rejection, undeclared parameter rejection, depth/result/cost rejection, service_role restriction, and no database/compiler execution.
