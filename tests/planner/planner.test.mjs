import assert from "node:assert/strict";
import { engineCapabilities, planQuery } from "../../packages/planner/index.mjs";

const ir = {
  version: "v1",
  kind: "graph_query",
  graph: "app",
  root: { label: "User", alias: "u" },
  steps: [{ edge: "KNOWS", direction: "out", target: { label: "User", alias: "v" } }],
  filters: [],
  projection: [{ field: "u.id" }],
  orderBy: [],
  limit: 10,
  offset: 0,
  depth: 1,
  parameters: []
};

const engines = engineCapabilities({
  age: { available: true, features: ["graph_query"] },
  postgresqlRecursive: { available: true, features: ["graph_query"] }
});

assert.equal(planQuery(ir, { engines }).engine, "apache-age");

assert.equal(
  planQuery(ir, { engines, preferred: ["postgresql-recursive", "apache-age"] }).engine,
  "postgresql-recursive"
);

const fallback = planQuery(ir, {
  engines: engineCapabilities({
    age: { available: false, features: [] },
    postgresqlRecursive: { available: true, features: ["graph_query"] }
  })
});
assert.equal(fallback.engine, "postgresql-recursive");
assert.equal(fallback.reason, "fallback");
assert.equal(fallback.rejected[0].reason, "unavailable");

assert.throws(
  () => planQuery(ir, { engines: engineCapabilities() }),
  error => error.code === "NO_EXECUTION_ENGINE"
);

assert.throws(
  () => planQuery({ ...ir, version: "v2" }, { engines }),
  error => error.code === "INVALID_QUERY_IR"
);

console.log("planner tests passed");
