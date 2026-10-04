# Build Prompt 03 — Supabase Compatibility Stack

## Mission

Reuse Supabase services where they reduce duplication while keeping Vibe PostgreSQL/RLS as the authoritative security boundary.

## Scope

Build the compatibility layer around the existing Vibe database.

Core gate:
- Supabase Auth starts against the Vibe database.
- PostgREST starts against the Vibe database.
- PostgREST exposes only explicitly selected Vibe schemas.
- Signed JWT claims reach PostgreSQL RLS through PostgREST.
- An authenticated tenant request sees only its own rows.

Compatibility candidates:
- Realtime
- Storage
- Supavisor/pooling

These services must not be marked compatible merely because their containers start. Add health and security evidence for each service that is enabled.

## Security rule

Never make a client-controlled tenant GUC authoritative. PostgREST must verify the signed JWT first; RLS may then consume the verified request.jwt.claims context.

Service-role credentials remain server-side only.

## Do not implement

Query IR, Graph API, SDK, CLI, Graph Studio, MCP, GraphRAG, Cloud or billing.

## Exit gate

The enabled compatibility services have executable health/security evidence and no tenant-isolation regression.
