# API contracts

- [DECIDED] All data requests go through the approved Graph API / client architecture.
- [DECIDED] Errors shown to users: human-readable failure, request ID where available, retry. Never SQL, stack traces or credentials, except on explicitly developer-facing surfaces.
- [PROPOSED] Responses indicate when result limits/truncation apply.
- [UNKNOWN] Endpoint list, auth model, pagination, error schema, versioning.
- [VALIDATED] Schema Catalog v1 read contract: `GET /rpc/vibe_schema_catalog` (PostgREST, `authenticated` only) returns `{catalog_version:"v1", graphs:{<graph>:{labels, edges:[{name,from,to}]}}}`; consumed by `vibe schema pull`. See decisions/stage-11-cli.md.
- [VALIDATED] CLI commands (Stage 11): config, graph query/mutations, schema types/inspect/pull, migrate new/status/up/verify, diagnostics, local status.
- [UNKNOWN] Graph API endpoint list beyond the SDK's transport route names, pagination, error schema, versioning.
