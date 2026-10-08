# @leruchi/cli

The Vibe CLI is a thin developer tool over the JavaScript SDK and Schema Catalog.

## Configuration

`vibe config set --base-url https://api.example` stores only the base URL in `.vibe/config.json`.

Authentication is supplied through `VIBE_TOKEN`; tokens are never written to project configuration.

## Graph query

```bash
vibe graph query --graph vibe_security --label Account --select name --eq name=Alice --limit 25
```

## Graph mutation

```bash
vibe graph create-vertex --graph vibe_security --label Account --property name=Alice
```

## Schema types

```bash
vibe schema types --file catalog.json --out vibe.d.ts
```

## Diagnostics/local development

- `vibe diagnostics` checks the configured `/health` endpoint.
- `vibe local status` delegates to `docker compose ps`.

The CLI does not compile Vibe IR, authorize tenants, bypass RLS, or accept raw SQL/Cypher. Server-side validation remains authoritative.
