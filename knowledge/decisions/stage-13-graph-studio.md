# Stage 13 — Graph Studio

Status: VALIDATED.

## Decisions

- Graph Studio is a Type C canvas application, not a normal max-width CRUD page.
- Schema Catalog is the source of graph metadata.
- Graph API is the source of authorization, tenant context, limits and compiled execution.
- Browser clients never receive service credentials.
- Normal users never receive free-form Cypher.
- Realtime events trigger secure Graph API refetch rather than carrying authoritative row/property payloads.
- The first graph renderer is an isolated SVG spike. A production renderer will be selected only after measuring 1,000 nodes, 3,000 edges, interaction latency and mobile behavior.
- Vibe UI uses semantic OKLCH tokens and Base UI; Radix is prohibited.

## Current implementation

- restored missing Vibe UI token/layout/screen/accessibility references;
- created a Next.js/React/Tailwind v4 Graph Studio application shell;
- implemented a first Graph Explorer interaction spike with bounded depth/result controls and keyboard-selectable nodes;
- added reproducible Base UI/style audit;
- added Stage 13 typecheck/build CI.

## Remaining

- real authenticated Graph API integration;
- live Schema Catalog integration;
- Graph Schema screen;
- Traversal Builder;
- loading/empty/error states wired to real requests;
- responsive/browser accessibility evidence;
- 1,000-node/3,000-edge benchmark and production renderer decision.


## Stage 13 continuation decisions

- The Graph API is now an explicit authenticated server boundary over the existing Query IR, Mutation IR, Schema Catalog, validation, compilers and Secure Execution Engine.
- Graph Studio does not call PostgreSQL directly. Browser requests use server-side Next.js proxy routes and a session cookie; service credentials are never embedded in browser code.
- Graph API errors use the existing Vibe normalized error shape at the response root so the JavaScript SDK and Studio share one error contract.
- Graph Schema is catalog-driven. The Studio does not invent labels, edges or ownership metadata.
- Traversal Builder sends/represents structured traversal specifications only; it does not expose a free-text Cypher editor.
- The current renderer benchmark is a synthetic SVG string-generation baseline. It is evidence for regression detection, not production renderer selection. Browser FPS/mobile interaction evidence is still required before choosing a production renderer.


## Tenant-visible correctness finding

- The initial Explorer contained a static demo graph and did not render the rows returned by its authenticated Graph API request. This was a UI correctness/security-UX defect because it could make tenant-isolated users appear to share graph data.
- The Explorer must never use synthetic data as a fallback after authenticated data loading. Empty, loading and error states are explicit.
- The tenant-scoped Schema Catalog provider binds the verified JWT tenant claim to PostgreSQL transaction-local `request.jwt.claims`; RLS remains authoritative.
- A regression test now fails if the Explorer reintroduces the named static demo nodes or stops deriving displayed nodes from authenticated query results.


## Stage 13 final evidence

- VALIDATED: authenticated tenant A/B browser rendering, 360px responsive behavior, keyboard focus and theme switching.
- VALIDATED: live PostgreSQL/AGE-backed Studio composition through the Graph API, tenant-scoped Schema Catalog, Query IR, ExecutionContext and RLS.
- VALIDATED: renderer browser regression benchmark at 100/500/1,000 SVG nodes with visible-node interaction latency.
- VALIDATED: TypeScript build and Base UI architecture audit.
