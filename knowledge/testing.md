# Testing

## Core policy

Security tests are merge blockers.

No feature is VALIDATED without relevant executable evidence.

Every build prompt must report:

1. What changed.
2. Files changed.
3. Commands/tests executed.
4. Results.
5. Architecture decisions discovered.
6. Security implications.
7. Remaining UNKNOWN items.
8. Next stage.

## Required test layers

As the system grows, use:

- unit tests;
- integration tests;
- database tests;
- security/adversarial tests;
- API contract tests;
- compatibility tests;
- fuzz/property tests where appropriate;
- performance tests;
- end-to-end tests.

Do not add every test category before it is useful; introduce the smallest layer required by the current stage.

## Security

At minimum, tenant-isolation tests must verify both allowed same-tenant access and denied cross-tenant access.

## UI

When UI exists, verify:

- 360px;
- 768px;
- 1440px;
- dark theme;
- light theme;
- keyboard operation;
- focus visibility/restoration;
- loading/empty/error states;
- semantic token usage;
- Base UI audit.
