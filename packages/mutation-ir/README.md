# Vibe Mutation IR v1

Mutation IR is a write-specific contract. It is intentionally separate from Query IR so read validation cannot silently become a write capability.

Supported operations:
- create_vertex
- create_edge
- update_vertex
- update_edge
- delete_edge
- delete_vertex

The compiler always injects the trusted tenant context as `tenant_id`; callers cannot supply or override that field. Destructive operations require `graph:delete` in addition to `graph:write`.

The IR contains no Cypher or SQL fields. Values are parameterized or placed in compiler-owned bindings.