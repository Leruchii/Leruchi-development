# Contributing to VibeDB

Thanks for contributing to VibeDB Core.

## Before you start

- Read the public architecture and package documentation in `docs/`.
- Use Node.js 24.
- Keep Query IR, Mutation IR, Retrieval IR and Context IR engine-neutral.
- Reuse existing validation, Schema Catalog, ExecutionContext, planner/compiler and Secure Execution boundaries.
- Do not introduce raw SQL/Cypher as an untrusted public contract.
- Tenant identity and capabilities must remain server-authoritative.

## Development

Run the focused tests for the area you change, then run the repository regression workflows required by the current build stage.

For agent/MCP changes, include adversarial tests for:
- tenant or credential injection;
- capability escalation;
- oversized/deep inputs;
- sensitive telemetry leakage;
- accidental execution from diagnostic paths.

## Pull requests

Describe:
- what changed;
- which canonical contract it extends;
- security implications;
- tests/CI run;
- any intentionally deferred behavior.

Do not include secrets, customer data, private Cloud/Enterprise implementation details, or internal development documents in public pull requests.
