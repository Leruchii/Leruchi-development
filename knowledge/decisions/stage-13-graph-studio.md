# Stage 13 — Graph Studio

Status: IN_PROGRESS.

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
