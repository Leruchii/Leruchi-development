import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { calculateCost, validateQuery } from "../../packages/query-validation/index.mjs";

const fixture = JSON.parse(fs.readFileSync("packages/query-ir/fixtures/person-knows.json","utf8"));
const catalog = JSON.parse(fs.readFileSync("packages/query-validation/catalog-fixture.json","utf8"));
const trusted = { tenantId:"tenant_a", role:"authenticated", capabilities:["graph:read"] };

test("accepts valid IR with trusted context", () => {
  const r = validateQuery(fixture, trusted, catalog);
  assert.equal(r.ok, true);
  assert.equal(r.cost, calculateCost(fixture));
});

test("rejects missing tenant", () => {
  const r = validateQuery(fixture, { ...trusted, tenantId:"" }, catalog);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.code === "MISSING_TENANT_CONTEXT"));
});

test("rejects missing capability", () => {
  const r = validateQuery(fixture, { tenantId:"tenant_a", role:"authenticated", capabilities:[] }, catalog);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.code === "CAPABILITY_DENIED"));
});

test("rejects unknown graph", () => {
  const bad = structuredClone(fixture);
  bad.graph = "unknown_graph";
  const r = validateQuery(bad, trusted, catalog);
  assert.ok(r.errors.some(e => e.code === "UNKNOWN_GRAPH"));
});

test("rejects unknown label", () => {
  const bad = structuredClone(fixture);
  bad.root.label = "Unknown";
  const r = validateQuery(bad, trusted, catalog);
  assert.ok(r.errors.some(e => e.code === "UNKNOWN_LABEL"));
});

test("rejects unknown edge", () => {
  const bad = structuredClone(fixture);
  bad.steps[0].edge = "UNKNOWN";
  const r = validateQuery(bad, trusted, catalog);
  assert.ok(r.errors.some(e => e.code === "UNKNOWN_EDGE"));
});

test("rejects incompatible traversal", () => {
  const bad = structuredClone(fixture);
  bad.steps[0].target.label = "Unknown";
  const r = validateQuery(bad, trusted, catalog);
  assert.ok(r.errors.some(e => e.code === "UNKNOWN_LABEL"));
});

test("rejects undeclared parameter", () => {
  const bad = structuredClone(fixture);
  bad.filters[0].value.param = "missing";
  const r = validateQuery(bad, trusted, catalog);
  assert.ok(r.errors.some(e => e.code === "UNDECLARED_PARAMETER"));
});

test("rejects depth over 6", () => {
  const bad = structuredClone(fixture);
  bad.depth = 7;
  const r = validateQuery(bad, trusted, catalog);
  assert.ok(r.errors.some(e => e.code === "DEPTH_EXCEEDED"));
});

test("rejects result limit over 1000", () => {
  const bad = structuredClone(fixture);
  bad.limit = 1001;
  const r = validateQuery(bad, trusted, catalog);
  assert.ok(r.errors.some(e => e.code === "RESULT_LIMIT_EXCEEDED"));
});

test("rejects excessive cost", () => {
  const bad = structuredClone(fixture);
  bad.depth = 6;
  bad.limit = 1000;
  const r = validateQuery(bad, trusted, catalog);
  assert.ok(r.errors.some(e => e.code === "COST_EXCEEDED"));
});

test("rejects service_role without trusted backend", () => {
  const r = validateQuery(fixture, { tenantId:"tenant_a", role:"service_role", capabilities:["graph:read"] }, catalog);
  assert.ok(r.errors.some(e => e.code === "SERVICE_ROLE_REQUIRES_TRUSTED_BACKEND"));
});

test("does not execute database or compiler", () => {
  const r = validateQuery(fixture, trusted, catalog);
  assert.equal(r.ok, true);
  assert.equal(typeof r.cost, "number");
});
