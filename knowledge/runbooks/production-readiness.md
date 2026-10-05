# Production Readiness Runbook

Status: IN_PROGRESS — Stage 20.

## 1. Pre-release gate

Run, in order:

1. `node scripts/production-readiness-audit.mjs`
2. `node --test tests/production-readiness/*.test.mjs`
3. the Stage 20 workflow;
4. the relevant security, execution, Studio, MCP, GraphRAG, observability and backup/recovery workflows;
5. the architecture regression audit.

Do not release from a green unit-test result when a relevant integration workflow is red.

## 2. Schema upgrade

- Use the `vibe_migrator` connection only.
- Run the forward-only numbered migration runner.
- Never edit an already-applied migration in place.
- A stored migration SHA-256 checksum must match the repository file.
- If checksum drift is reported, stop the deployment, restore the original migration file or create a new forward migration, and rerun the readiness gate.
- Re-run migrations to prove idempotence before promoting the upgraded deployment.

The Stage 20 upgrade drill proves the supported prior baseline survives the current migration chain and that checksum drift fails closed.

## 3. Backup and recovery

- Produce PostgreSQL custom-format backups through `scripts/vibedb-backup.sh`.
- Verify the manifest checksum and byte size before restore.
- Prefer `VIBEDB_RESTORE_MODE=fresh` for disaster recovery.
- Use `replace` only for deliberate in-place replacement.
- Run the production-image AGE/pgvector recovery drill after restore tooling changes.
- Treat measured CI restore time as reference evidence, not a customer SLA.

Stage 17 is the authoritative recovery contract.

## 4. Incident response

Use the request ID and trace ID emitted by the API to correlate application, audit and database timing signals.

During an incident:

1. identify the affected deployment/version;
2. preserve relevant request/trace identifiers;
3. determine whether the failure is authorization, validation, execution, database, migration or infrastructure related;
4. stop rollout if the failure is a correctness/security regression;
5. use backup/recovery procedures when data integrity is at risk;
6. record the root cause and add an executable regression test before closing the incident.

Never use raw database errors or telemetry containing secrets as an incident artifact.

## 5. Dependency and image updates

- Update one dependency/version contract at a time where practical.
- Keep exact package versions.
- Keep PostgreSQL/AGE/pgvector versions explicitly pinned.
- Run the production-readiness audit and relevant integration workflows for every runtime/database version change.
- Do not accept `latest`, wildcard, caret or tilde runtime dependency ranges.
- Record compatibility evidence before changing the supported database image.

## 6. Capacity and saturation

The Stage 20 concurrency smoke is a bounded reference test, not a universal capacity limit. It exercises 32 concurrent database tasks through a pool capped at four connections.

Production operators must measure:
- pool utilization;
- connection wait time;
- query latency;
- statement timeout rate;
- error rate;
- database CPU/memory/IO;
- queue depth;
- backup/restore duration.

Do not convert the CI fixture's concurrency result into a customer-facing throughput or latency promise without workload-specific evidence.

## 7. Rollback

Application rollback is permitted only when schema compatibility has been proven for the target version. Do not roll application binaries backward across incompatible schema changes.

For failed schema changes:
- stop the rollout;
- preserve the failed deployment evidence;
- restore from a verified backup only when data integrity requires it;
- otherwise apply a forward corrective migration.

Hosted regional recovery, backup cadence, retention and commercial RPO/RTO remain Stage 18 concerns.
