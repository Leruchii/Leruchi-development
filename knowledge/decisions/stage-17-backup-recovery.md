# Stage 17 — Backup + Recovery

Status: VALIDATED.

## Contract

Leruchi backups are PostgreSQL-native because PostgreSQL is the system of record. The OSS recovery contract uses PostgreSQL custom-format dumps (`pg_dump --format=custom`) and `pg_restore`.

The backup artifact is paired with a manifest containing:
- artifact name;
- SHA-256 checksum;
- byte size;
- backup duration;
- PostgreSQL server version;
- pg_dump version;
- migration-ledger digest.

The restore path verifies both the manifest checksum and artifact byte size before invoking `pg_restore`.

Restore mode is explicit:
- `fresh` restores into a newly created empty database without destructive cleanup;
- `replace` cleans conflicting objects before an intentional in-place replacement.

Disaster-recovery automation should prefer `fresh`. `replace` remains available for controlled replacement drills and operator workflows.

## Recovery invariants

1. Restore never proceeds when the backup checksum is invalid.
2. Restore never proceeds when the artifact byte size differs from the manifest.
3. Migration metadata survives backup/restore unchanged.
4. Backup/restore does not bypass the application's PostgreSQL/RLS security model.
5. A restore is not declared compatible merely because `pg_restore` exits successfully.
6. Production-image drills must prove Apache AGE and pgvector extension-backed objects survive recovery.
7. The recovery point is the completed backup snapshot: writes committed after that snapshot are not claimed to be recoverable from that artifact.
8. RPO/RTO evidence comes from executable drills, not guessed defaults.

## Failure modes covered

- missing backup artifact;
- missing manifest;
- unsupported or malformed manifest;
- checksum mismatch;
- size mismatch;
- invalid restore mode;
- restore command failure;
- post-restore data mismatch;
- post-restore migration-ledger mismatch;
- missing AGE/pgvector extensions after restore;
- AGE graph object/data mismatch;
- pgvector object/data mismatch;
- incorrect recovery-point boundary.

## Production-image evidence

Stage 17 CI builds the repository's production database image:
- PostgreSQL 17.11;
- Apache AGE 1.7.0;
- pgvector 0.8.7.

The production-like drill:
1. initializes the real Leruchi database image;
2. creates the Stage 17 relational/migration fixture;
3. creates and verifies a real AGE vertex;
4. verifies pgvector-backed fixture data;
5. captures a custom-format backup;
6. commits a distinct post-backup write;
7. creates a fresh empty recovery database;
8. restores with `LERUCHI_RESTORE_MODE=fresh`;
9. verifies AGE and pgvector extensions are present;
10. verifies the AGE vertex, vector object/data and migration ledger are equal to the source snapshot;
11. verifies pre-backup data is present and the post-backup write is absent.

A production-image drill passed in Stage 17 workflow run `37289351363`. On that CI fixture, the observed production-image backup duration was 232 ms and restore duration was 146 ms. The plain PostgreSQL fixture in the same run observed 217 ms backup and 61 ms restore.

These numbers are reference CI benchmark evidence for the tested fixture and runner. They are not a hosted-service SLA or a prediction for customer database sizes.

## RPO evidence

The executable recovery-point test proves snapshot semantics: data committed before the completed dump snapshot is restored, while a write committed after that snapshot is absent from the recovered database.

For the OSS runtime, this is the evidence-backed recovery-point contract. A numeric operational RPO additionally depends on how frequently backups are scheduled, backup completion latency, failure detection and storage/replication topology. Those hosted operational policies belong to the Stage 18 Vibe Cloud control plane and must not be invented as an OSS guarantee.

## RTO evidence

The production-like CI drill measures the end-to-end restore operation for its controlled fixture. Stage 17 workflow run `37289351363` observed 146 ms for the fresh production-image restore.

This is an executable reference baseline, not a production SLA. Actual RTO varies with database size, indexes, hardware, network/object-store retrieval, extension versions, operational orchestration and validation work. Hosted RTO targets belong to Stage 18.

## Defects discovered and fixed during validation

The recovery work exposed two correctness defects that were fixed rather than bypassed:

1. Clean database initialization granted privileges on `ag_catalog` before the AGE extension created that schema. The bootstrap now creates AGE before AGE-specific grants. Stage 01 clean-install CI passed after the fix.
2. The original restore script always used `--clean --if-exists`, which is inappropriate for a genuinely fresh disaster-recovery database and caused AGE cleanup to fail. Restore now has explicit `fresh` and `replace` modes.

The shell restore path also regained an explicit manifest byte-size verification, with regression tests preventing silent loss of that integrity check.

## Validation evidence

- Stage 17 workflow run `37289351363` — production PostgreSQL/AGE/pgvector recovery drill passed.
- Stage 01 database-foundation run `37288434154` — clean Leruchi database initialization passed after AGE bootstrap ordering was corrected.
- Architecture regression audit passed inside the Stage 17 validation workflow.
- Contract tests cover manifest integrity, tampering, size mismatch and restore-mode behavior.

Stage 17 is VALIDATED for the OSS backup/recovery contract. Hosted backup scheduling, retention, storage replication, regional recovery and commercial RPO/RTO commitments remain Stage 18 control-plane concerns.


## Canonical operational naming

`scripts/leruchi-backup.sh` and `scripts/leruchi-restore.sh` are the canonical entry points. The historical `scripts/vibedb-backup.sh` and `scripts/vibedb-restore.sh` paths remain compatibility wrappers. The restore implementation prefers `LERUCHI_RESTORE_MODE`, accepts `VIBEDB_RESTORE_MODE` as a fallback, and preserves the existing `replace` default. Database name `vibedb`, role names, and `vibe_meta` schema identifiers are intentionally unchanged in this slice; changing those requires a separate versioned migration and rollback plan.
