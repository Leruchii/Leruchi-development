# Database

- [DECIDED] PostgreSQL + Apache AGE + pgvector.
- [EXPERIMENTAL] Not yet proven. Prompt 01 must show: PostgreSQL starts; AGE loads; pgvector loads; Vibe database roles are separated; a graph can be created; vertices and edges can be created; a vector column can be created and queried; automated tests prove it; versions are pinned; security assumptions are documented.
- [DECIDED] No runtime superuser privileges.
- [DECIDED] RLS must remain enabled.
- [DECIDED] Versions must be pinned.
- [UNKNOWN] Pinned PostgreSQL, AGE and pgvector versions.
- [UNKNOWN] Role names and privilege matrix.
- [UNKNOWN] Schema layout, migration tooling, vector dimensions and index choices.
- [UNKNOWN] Recursive-CTE fallback design.
