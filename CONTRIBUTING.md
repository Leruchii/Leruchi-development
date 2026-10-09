# Contributing to Leruchi

Thanks for helping improve Leruchi.

## Runtime and local checks

- Use Node.js 24. Earlier Node.js major versions are not supported.
- Read the repository's `README.md` and the relevant package documentation before making changes.
- Keep SDK, CLI, REST/Graph API and MCP behavior aligned with the existing Query IR and Mutation IR contracts.
- Do not add direct database/compiler behavior to the SDK or CLI.
- Never include credentials, tenant-specific data, private keys, or environment files in commits.

## Before opening a pull request

Run the focused tests for the packages you changed, then run the relevant workflow or audit scripts. Security and tenant-isolation tests are merge blockers. Explain the exact tests and results in your pull request.

Keep changes focused. Do not change persisted schema identifiers, JWT audiences, or external protocol values without a versioned migration and rollback plan.
