# Legacy PR Reconciliation — Graph Studio (2026-10-09)

Status: REVIEWED; no wholesale merge or blind cherry-pick.

## PR #22 — Graph API runtime for Studio

The old PR introduced the first `packages/graph-api/index.mjs`, bearer-token checks and a minimal `tests/graph-api/api.test.mjs`. Those paths now exist on current `main`, but the implementation has evolved substantially: capability grants, execution context, multiple query engines, retrieval/explainability, agent intent/planning, audit and observability surfaces are integrated. The current Graph API test suite is much broader than the original three smoke tests. The old implementation is superseded; do not copy it over current code.

The old `apps/studio/lib/vibe-api.ts` client is not present in the current tree. Current browser requests use Next.js server-side proxy routes under `apps/studio/app/api/studio/`; keep browser credentials and database access behind those server boundaries.

## PR #26 — Browser validation

The old `apps/studio/tests/browser.spec.mjs` is not present in current `main`. Its useful intent—responsive rendering, tenant-separated visible results and explicit unauthenticated errors—is covered by current `apps/studio/tests/browser/studio.spec.ts`, `live-composition.spec.ts`, and `tests/studio/tenant-render-contract.test.mjs`. The current test setup and selectors match the present UI. No old test-file port is needed.

## PR #29 — SVG renderer benchmark

The benchmark file `apps/studio/tests/browser/renderer-benchmark.spec.ts` already exists on current `main` and has been improved relative to the legacy patch: it waits for catalog readiness and measures interaction on a visible node rather than a potentially clipped final node. It covers 100/500/1,000 nodes and deliberately avoids machine-specific tight performance thresholds. It currently measures zero edges, so the 1,000-node/3,000-edge stress case and final production-renderer decision remain open.

## Gate and follow-up

- Stage 13's exact-head CI has passed on the recent SDK/CLI migration PR head; re-run relevant checks for this documentation-only PR.
- Do not reintroduce static demo data, direct browser-to-database access, free-form Cypher, or the superseded browser mocks.
- The Stage 13 decision document now distinguishes completed evidence from the remaining edge-density benchmark.
