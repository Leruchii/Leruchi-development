# Operations

Status: IN_PROGRESS for Stage 20 Production Readiness.

## Validated runtime evidence

- PostgreSQL 17.11 + Apache AGE 1.7.0 + pgvector 0.8.7 are pinned in the production database image.
- Stage 16 provides redaction-safe request IDs, metrics, traces and timing.
- Stage 17 provides executable backup integrity, fresh/replace restore, migration compatibility, AGE/pgvector recovery and recovery-point evidence.
- Graph API database access now has an explicit bounded pool policy: max 10 connections, 5s connection timeout, 30s idle timeout, 30s statement timeout and 35s query timeout.
- Stage 20 adds a bounded concurrency smoke test using a smaller reference pool of four connections under 32 concurrent database tasks.

## Operational boundaries

Stages 18 and 19 remain DEFERRED. Hosted provisioning, backup scheduling/retention, regional replication, billing and commercial RPO/RTO are not OSS runtime guarantees.

The Stage 20 OSS contract covers safe defaults, upgrade behavior, recovery mechanisms and executable reference evidence. It does not claim a universal production capacity or SLA for arbitrary hardware/database sizes.

## Required operator procedures

Before a production deployment, operators must have documented procedures for:
- supported schema upgrade;
- migration checksum drift handling;
- backup verification and restore;
- incident triage using request/trace IDs;
- rollback/recovery;
- dependency/version updates;
- capacity review and saturation monitoring.

These procedures are release gates, not optional documentation.
