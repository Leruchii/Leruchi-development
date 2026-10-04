# Stage 17 — Backup + Recovery

Status: IN_PROGRESS.

## Contract

VibeDB backups are PostgreSQL-native because PostgreSQL is the system of record. The first OSS recovery contract uses PostgreSQL custom-format dumps (pg_dump --format=custom) and pg_restore.

The backup artifact is paired with a manifest containing:
- artifact name;
- SHA-256 checksum;
- byte size;
- backup duration;
- PostgreSQL server version;
- pg_dump version;
- migration-ledger digest.

The restore path verifies the manifest checksum and byte size before invoking pg_restore.

## Recovery invariants

1. Restore must never proceed when the backup checksum is invalid.
2. Migration metadata must survive backup/restore unchanged.
3. Backup/restore does not bypass the application's PostgreSQL/RLS security model.
4. The migration ledger is evidence for schema compatibility; a restore is not declared compatible merely because pg_restore exits successfully.
5. RPO/RTO are measured from actual drills. They are never guessed from tooling defaults.

## Failure modes covered

- missing backup artifact;
- missing manifest;
- unsupported manifest version;
- checksum mismatch;
- size mismatch;
- restore command failure;
- post-restore data mismatch;
- post-restore migration-ledger mismatch.

## Current evidence

The Stage 17 CI drill creates a controlled PostgreSQL fixture, captures a custom-format backup, destroys the fixture rows, restores the backup, and verifies both data and migration-ledger equality. It records observed backup and restore timing.

The CI environment uses PostgreSQL 17. The production VibeDB image additionally contains Apache AGE and pgvector; a later environment-specific drill must prove extension/object restoration before Stage 17 is marked VALIDATED.

## RPO/RTO policy

Until a production-like drill has been measured:
- RPO: NOT YET CLAIMED.
- RTO: NOT YET CLAIMED.

The fixture CI run is validation of the backup/restore mechanism, not a production SLA.

## Next gate

Run Stage 17 CI, inspect timing output and failure paths, then add a production-image restore drill before marking Stage 17 VALIDATED.
