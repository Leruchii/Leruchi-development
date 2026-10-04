---
name: vibe-age
description: Design, validate, secure, and troubleshoot Apache AGE graph functionality inside VibePlatform PostgreSQL. Use when creating graphs, vertices, edges, traversals, AGE extension setup, or AGE security boundaries.
---

# Vibe AGE Skill

AGE is the graph execution implementation behind Vibe. It is not the public API contract.

## Rules

- Read `AGENTS.md`, `knowledge/architecture.md`, `knowledge/database.md`, and `knowledge/security.md`.
- Keep AGE compatible with the pinned PostgreSQL version.
- Do not expose unrestricted raw Cypher to normal clients.
- Treat graph identifiers, labels, edge types and traversal depth as untrusted until validated.
- Do not bypass PostgreSQL/RLS security assumptions because AGE is being used.
- Prefer parameterized/safely constructed graph queries.
- Document AGE-specific limitations discovered during validation.

## Required validation

Prompt 01 must prove:

- AGE loads;
- a graph can be created;
- vertices can be created;
- edges can be created;
- traversal works;
- the runtime role has only intended privileges.

Prompt 02 must prove tenant isolation for graph access and document the exact enforcement mechanism.

## Forbidden

- making AGE a public client contract;
- unrestricted service-role exposure;
- assuming graph security works without adversarial tests;
- silently introducing a second graph database.
