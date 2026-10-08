# Product Naming Review — Leruchi

Status: REVIEW REQUIRED BEFORE PUBLIC OSS BRAND LOCK

## Decision

The product name is now finalized as **Leruchi**. The prior working name VibeDB is retained only where historical migration context is necessary.

However, **Leruchi is not sufficiently unique to be treated as a clean long-term brand by default**. The current name should remain provisional until a formal trademark/domain/package/namespace clearance review is completed before Stage 32 public publication.

## Why the current name is risky

Current web research found multiple independent uses of the Leruchi/vibeDB name in database-related products and projects, including:

- a managed multi-database service at leruchi.dev;
- an AI database control-plane product at leruchi.me;
- a public GitHub project describing vibeDB as a foundational memory database;
- a separate SQLite/document-database project with the same name;
- an existing npm CLI namespace associated with vibeDB;
- additional public projects using Leruchi for schema generation, desktop database management, and SQLite-as-a-service.

These are not legal determinations. They demonstrate naming collision and discoverability risk and justify formal clearance before public brand lock.

## Product-fit assessment

Leruchi remains a strong descriptive/product-fit name for the current vision:

- memorable;
- clearly database-adjacent;
- compatible with developer and AI-agent positioning;
- broad enough to describe a database/data platform rather than a single storage engine.

The weakness is not product fit. The weakness is **distinctiveness and long-term brand defensibility**.

## Rename timing

If the name is changed, Stage 31 / pre-Stage-32 is the correct window.

A rename after public OSS publication would affect substantially more external surfaces:

- GitHub organization/repository references;
- package and SDK names;
- CLI command and executable names;
- MCP server identity;
- documentation and URLs;
- Docker/container/image names;
- API metadata and user-agent identifiers;
- telemetry and observability identifiers;
- examples and integrations;
- public links, forks, stars and downstream references.

The underlying architecture does not depend on the Leruchi name. Canonical IR, Query/Mutation/Retrieval IR, planner, validation/auth/capability boundaries, MCP safety, evaluation, observability, trace/replay, and PostgreSQL/AGE/pgvector architecture can remain unchanged through a rename.

## Required clearance gate before Stage 32

Before public publication, perform:

1. Trademark clearance in the intended launch jurisdictions.
2. Domain availability and defensibility review.
3. GitHub organization/repository/namespace review.
4. npm package and CLI namespace review.
5. PyPI and other relevant package-index review.
6. MCP ecosystem naming review.
7. Search-engine discoverability/confusion review.
8. Enterprise/developer credibility review.
9. Candidate-name collision review against database, AI, developer-tool and infrastructure products.
10. Decision record documenting keep/rename and the migration plan if renamed.

A legal trademark search or legal opinion must not be inferred from ordinary web-search results.

## Current release recommendation

**Keep Leruchi provisionally for engineering continuity. Do not publish the public OSS brand until the naming clearance gate is complete.**

If clearance is unfavorable, rename before Stage 32 and perform a controlled repository-wide migration rather than a blind global text replacement.

## Relationship to Stage 31

This review does not change the Stage 31 technical readiness gate or declare it validated.

Stage 31 remains IN_PROGRESS until the exact release candidate passes its readiness and regression requirements.

## Evidence date

Research performed: 2026-10-07.
