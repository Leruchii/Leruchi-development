# Database

Status: **EXPERIMENTAL — not yet validated**

## Core stack

- PostgreSQL
- Apache AGE
- pgvector

PostgreSQL is the system of record and security boundary.

## Prompt 01 acceptance criteria

The database foundation is not complete until executable evidence proves:

1. PostgreSQL starts successfully.
2. AGE loads successfully.
3. pgvector loads successfully.
4. Versions are pinned.
5. Vibe database roles are separated.
6. Runtime paths do not require superuser privileges.
7. A graph can be created.
8. Vertices and edges can be created.
9. Graph traversal works.
10. A vector column can be created.
11. Vector data can be queried.
12. Automated tests prove the above.
13. Security assumptions are documented.

## Roles

Role names and the complete privilege matrix are still UNKNOWN and must be established during Prompt 01.

## Migrations

Migration tooling and schema layout must be selected during Prompt 01. Do not add a migration framework merely because it is familiar; choose the smallest tool that fits the repository.

## Vector decisions

Vector dimensions, index strategy and workload assumptions remain UNKNOWN until the database spike establishes the initial contract.

## Graph fallback

Recursive CTE support is required as a fallback implementation path, but the routing policy and supported operations remain UNKNOWN.

## Security

RLS must remain enabled for protected application data. Runtime application code must not depend on superuser privileges.
