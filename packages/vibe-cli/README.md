# @leruchi/cli

The Leruchi CLI is a thin developer tool over the JavaScript SDK and Schema Catalog.

## Configuration

`leruchi config set --base-url https://api.example` stores only the base URL in `.leruchi/config.json`; existing `.vibe/config.json` files are read as a compatibility fallback.

Authentication uses `LERUCHI_TOKEN` (legacy fallback: `VIBE_TOKEN`); tokens are never written to project configuration. `LERUCHI_BASE_URL` is the canonical environment override, with `VIBE_BASE_URL` retained as a fallback.

## Graph query

```bash
leruchi graph query --graph vibe_security --label Account --select name --eq name=Alice --limit 25
```

## Graph mutation

```bash
leruchi graph create-vertex --graph vibe_security --label Account --property name=Alice
```

## Schema types

```bash
leruchi schema types --file catalog.json --out leruchi.d.ts
```

## Diagnostics/local development

- `leruchi diagnostics` checks the configured `/health` endpoint.
- `leruchi local status` delegates to `docker compose ps`.

The CLI does not compile Leruchi IR, authorize tenants, bypass RLS, or accept raw SQL/Cypher. Server-side validation remains authoritative.
