# Graph model

- [DECIDED] Graph metadata (vertex labels, edge labels, relationships, relevant properties, counts) comes from the Schema Catalog. Studio, SDKs, CLI, MCP and agents must not invent metadata.
- [DECIDED] Graph metadata supports two visibility scopes: shared (tenant_id = '') and tenant-owned (tenant_id = tenant identifier). Shared definitions are reusable platform/project schema; tenant-owned definitions allow customer-specific graphs without requiring a physical database/graph per tenant.
- [DECIDED] Graph data remains tenant-isolated independently of metadata visibility. A shared graph definition does not imply shared data.
- [DECIDED] Schema Catalog RLS is a defense-in-depth metadata boundary. PostgreSQL/RLS remains authoritative for graph data.
- [DECIDED] AGE graph names are implementation details. Public clients reference stable Vibe graph identities resolved through the Schema Catalog.
- [UNKNOWN] Exact physical mapping from a Vibe graph identity to one or more AGE graphs as scale/topology evolves.
- [UNKNOWN] How vectors relate to vertices (pgvector columns vs properties).
- [DECIDED] Property typing and identifier validation are enforced through the Schema Catalog and request validators rather than client-defined engine fragments.
