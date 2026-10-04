# Testing

Status: VALIDATED through Stage 06 — Query Validation + Cost Guardrails

## Stage 06 executable coverage

.github/workflows/stage-06-query-validation.yml proves:

- valid Query IR is accepted with trusted tenant/capability context;
- missing tenant context is rejected;
- missing graph:read capability is rejected;
- unknown graph/label/edge references are rejected;
- incompatible traversal endpoints are rejected;
- undeclared parameters are rejected;
- depth above 6 is rejected;
- result limits above 1000 are rejected;
- deterministic cost above 100 is rejected;
- service_role without trusted backend context is rejected;
- validation returns structured results without database/compiler execution.

## Security rule

The validator does not derive authorization from Query IR content. Tenant context is an explicit input from the trusted authentication boundary.

## Merge blocker

Stages 01 through 06 have executable repository/CI evidence.
