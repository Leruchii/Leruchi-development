# Testing

- [DECIDED] Security tests are merge blockers.
- [DECIDED] No success claim without running the relevant tests; each prompt reports what changed, files, tests executed, results, decisions discovered, problems, and what remains UNKNOWN.
- [DECIDED] Each prompt ends in VALIDATED, EXPERIMENTAL or BLOCKED, and the knowledge base is updated.
- [DECIDED] UI checks: 360/768/1440px, light and dark themes, keyboard operation, focus visibility/restoration, loading/empty/error states, semantic tokens only, and scripts/audit-baseui.sh src passing.
- [PROPOSED] UI audit as a CI step alongside TypeScript, unit, integration and security tests.
- [UNKNOWN] Test framework, CI provider, coverage targets.
