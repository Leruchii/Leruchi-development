---
name: vibe-secure-execution
description: Enforce the single Vibe execution path from trusted request context through validation, compilation, transaction, PostgreSQL RLS and normalized results.
---

# Vibe Secure Execution Skill

Stage 08 is the enforcement boundary for all future client surfaces.

## Rules

- No client surface executes compiled SQL/Cypher directly.
- Authentication context must be trusted before validation.
- Validation must run before compilation.
- Compilation must run before execution.
- Transaction-scoped database execution uses one connection/client.
- Database role/RLS remains authoritative.
- Prepared statements and parameter maps are mandatory.
- Request parameters must match declared IR parameters.
- Database/compiler errors are normalized; raw SQL, stack traces and secrets never cross the public error boundary.
- Roll back on execution failure.
- Commit only after successful execution.
- Return normalized result columns/rows.

## Workflow

request
→ trusted context
→ Query IR
→ validation
→ compilation
→ parameter binding
→ BEGIN
→ execute
→ RLS
→ COMMIT
→ normalized response

Any failure before BEGIN must execute no database query. Any failure after BEGIN must attempt rollback.
