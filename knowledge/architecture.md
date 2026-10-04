# Architecture

All items are design-level. None is VALIDATED until its build prompt produces passing evidence.

## Structure
- [DECIDED] The architecture is organised into five architectural planes.
- [UNKNOWN] The names and boundaries of the five planes (not in the source material).
- [DECIDED] Vibe Query IR is the central abstraction.
- [DECIDED] A Schema Catalog is the authoritative source of graph metadata.
- [DECIDED] Request flow: Graph API → validation → planner → compiler → execution.
- [DECIDED] PostgreSQL + AGE + pgvector remain the core.
- [DECIDED] AGE is treated as an implementation detail, not a public contract.
- [DECIDED] A PostgreSQL recursive-CTE fallback exists for graph traversal.
- [UNKNOWN] When the fallback is used and which operations it covers.
- [DECIDED] AI/MCP access uses scoped capabilities, not unrestricted service_role.
- [DECIDED] Graph-aware security with RLS is a hard boundary (see security.md).
- [DECIDED] Graph realtime events are ID-only (see realtime.md).
- [DECIDED] OSS repository is separate from the private Vibe Cloud control plane.

## Build order
- [DECIDED] Prompts run sequentially; each layer is proven before the next. Numbered list: 00 Repository Bootstrap, 01 PostgreSQL+AGE+pgvector, 02 RLS+AGE Security, 03 Supabase Compatibility, 04 Schema Catalog, 05 Query IR, 06 Query Validation, 07 AGE Compiler, 08 Secure Execution Engine, 09 Graph Mutations, 10 JavaScript SDK, 11 CLI, 12 Graph Realtime, 13 Graph Studio, 14 MCP, 15 GraphRAG, 16 Observability, 17 Backup/Recovery, 18 Vibe Cloud, 19 Billing, 20 Production Readiness.
- [PROPOSED] Revised order puts UI earlier: Foundation → Database → Security → Schema Catalog → Query IR → Graph API → UI primitives → App Shell → Graph Studio → SDK → Realtime → MCP → GraphRAG. This conflicts with the numbered order (see decisions/unknowns-and-contradictions.md).

## Graph UI components
- [UNKNOWN] Graph canvas library. Requires a spike: 1,000 nodes / 3,000 edges; dragging, zooming, selection, layout, frame rate, bundle size, mid-range mobile. Do not assume React Flow or Cytoscape.

## Supabase
- [PROPOSED] Supabase compatibility/service reuse (Prompt 03; original plan topic). Scope not provided.
