---
name: vibe-query-validation
description: Validate Vibe Query IR against the Schema Catalog, security context and deterministic cost/depth/result guardrails before compilation.
---

# Vibe Query Validation Skill

Validation is the security and cost gate between Query IR and any compiler.

## Rules
- Validate IR before any SQL/Cypher/AGE compilation.
- Schema references must resolve through the Schema Catalog.
- Tenant context must come from a trusted authentication boundary.
- Capabilities must be explicit.
- service_role requires trusted backend context.
- Enforce maximum depth, result limits and deterministic complexity/cost.
- Validate parameter references.
- Reject malformed or engine-specific fragments.
- Return structured errors.
- Never execute queries during validation.

## Provisional guardrails
- maximum depth: 6
- maximum results: 1000
- maximum cost: 100
