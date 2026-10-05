# PostgreSQL Recursive Compiler

Stage 21 fallback compiler for the engine-neutral Query IR.

It requires explicit Schema Catalog relational mappings for graph labels and edge relations. It emits parameterized PostgreSQL recursive CTEs and accepts no raw SQL/Cypher. It does not authorize or execute requests.

This is not production-ready fallback execution until Stage 21 database-backed equivalence, RLS, guardrail and observability evidence is green.
