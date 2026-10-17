# Leruchi Studio

Studio is the browser UI for the authenticated Graph API. It does not connect directly to PostgreSQL and must not bypass Graph API authorization or tenant isolation.

## Configure the Graph API

Copy `.env.example` to `.env.local` and set `LERUCHI_API_URL` to the URL of a running Graph API, for example:

```dotenv
LERUCHI_API_URL=http://127.0.0.1:4100
```

Restart the Studio dev server after changing environment variables. The `/api/studio/catalog` and `/api/studio/query` routes read the `leruchi_access_token` session cookie (the legacy `vibe_access_token` cookie is also accepted) and forward requests to the configured Graph API. A valid signed capability grant is required; setting the URL alone does not authenticate a user.

If the URL is missing, Studio returns `STUDIO_API_NOT_CONFIGURED` (503). If the session cookie is missing, it returns `UNAUTHORIZED` (401). If the Graph API cannot be reached, Studio returns a bounded upstream error instead of an unhandled server exception.

## Run Studio

From the repository root:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix .\\apps\\studio --no-audit --no-fund
npm run dev --prefix .\\apps\\studio
```

Open http://localhost:3000. The Graph API and its capability control-plane dependency must already be running and reachable on loopback. For the complete seeded database, ephemeral signing-key, control-plane, and browser-test setup, use the Stage 13 workflow at `.github/workflows/stage-13-graph-studio.yml`; it is the canonical integration recipe.

Do not commit `.env.local`, access tokens, signing keys, or database credentials. Never point the Studio test flow at a production database.
