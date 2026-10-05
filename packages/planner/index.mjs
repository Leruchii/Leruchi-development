const ENGINES = Object.freeze(["apache-age","postgresql-recursive"]);

const FEATURE_ENGINE_MATRIX = Object.freeze({
  graph_query: new Set(["apache-age","postgresql-recursive"]),
  vector: new Set(["apache-age","postgresql-recursive"]),
  hybrid: new Set(["apache-age","postgresql-recursive"])
});

function fail(code, message, details = undefined) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) error.details = details;
  throw error;
}

function assertEngine(engine) {
  if (!ENGINES.includes(engine)) fail("UNKNOWN_ENGINE", "Unsupported execution engine", { engine });
}

function requiredFeatures(ir) {
  const features = new Set(["graph_query"]);
  if (ir.extensions?.vector || ir.parameters?.some(p => p.type === "vector")) features.add("vector");
  if (ir.extensions?.hybrid) features.add("hybrid");
  return features;
}

/**
 * Selects an execution engine without changing the public Query IR.
 *
 * The planner is deliberately capability-driven: it never guesses that an
 * engine can execute a feature merely because a compiler exists. Callers
 * register the exact engine capabilities available in their deployment.
 */
export function planQuery(ir, {
  engines = {},
  preferred = ["apache-age", "postgresql-recursive"]
} = {}) {
  if (!ir || ir.version !== "v1" || ir.kind !== "graph_query") {
    fail("INVALID_QUERY_IR", "Planner requires Query IR v1 graph_query");
  }

  const features = requiredFeatures(ir);
  const candidates = [...new Set(preferred)];
  for (const engine of candidates) assertEngine(engine);

  const rejected = [];
  for (const engine of candidates) {
    const descriptor = engines[engine];
    if (!descriptor?.available) {
      rejected.push({ engine, reason: "unavailable" });
      continue;
    }

    const supported = new Set(descriptor.features ?? []);
    const missing = [...features].filter(feature => !supported.has(feature));
    if (missing.length) {
      rejected.push({ engine, reason: "missing_capabilities", missing });
      continue;
    }

    return {
      version: "v1",
      planner: "v1",
      engine,
      features: [...features],
      compiler: descriptor.compiler ?? engine,
      reason: engine === candidates[0] ? "preferred" : "fallback",
      rejected
    };
  }

  fail("NO_EXECUTION_ENGINE", "No registered execution engine can satisfy the query", {
    required_features: [...features],
    rejected
  });
}

export function engineCapabilities({
  age = { available: false, features: [] },
  postgresqlRecursive = { available: false, features: [] }
} = {}) {
  return {
    "apache-age": { available: Boolean(age.available), features: [...new Set(age.features ?? [])] },
    "postgresql-recursive": {
      available: Boolean(postgresqlRecursive.available),
      features: [...new Set(postgresqlRecursive.features ?? [])]
    }
  };
}
