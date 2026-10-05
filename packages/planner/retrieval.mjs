const GRAPH_ENGINES = Object.freeze(["apache-age","postgresql-recursive"]);
const VECTOR_ENGINES = Object.freeze(["postgresql-vector"]);

function fail(code, message, details = undefined) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) error.details = details;
  throw error;
}

function choose(source, candidates, capabilities, requiredFeature) {
  const rejected = [];
  for (const engine of candidates) {
    const descriptor = capabilities[engine];
    if (!descriptor?.available) {
      rejected.push({ engine, reason: "unavailable" });
      continue;
    }
    const features = new Set(descriptor.features ?? []);
    if (!features.has(requiredFeature)) {
      rejected.push({ engine, reason: "missing_capability", feature: requiredFeature });
      continue;
    }
    return { engine, rejected };
  }
  fail("NO_RETRIEVAL_ENGINE", `No registered engine can execute the ${source} retrieval source`, { source, required_feature: requiredFeature, rejected });
}

/**
 * Builds a deterministic multi-engine retrieval plan after Retrieval IR validation.
 * Hybrid retrieval intentionally returns two execution targets: graph execution
 * and vector execution. Fusion remains an application-level deterministic step.
 */
export function planRetrieval(ir, {
  capabilities = {},
  preferredGraph = GRAPH_ENGINES,
  preferredVector = VECTOR_ENGINES
} = {}) {
  if (!ir || ir.version !== "v1" || ir.kind !== "retrieval_query") {
    fail("INVALID_RETRIEVAL_IR", "Planner requires Retrieval IR v1");
  }
  const graph = ir.sources?.graph ? choose("graph", [...new Set(preferredGraph)], capabilities, "graph_query") : null;
  const vector = ir.sources?.vector ? choose("vector", [...new Set(preferredVector)], capabilities, "vector") : null;
  const mode = graph && vector ? "hybrid" : graph ? "graph" : "vector";
  return Object.freeze({
    version: "v1",
    planner: "retrieval-v1",
    mode,
    graph: graph ? Object.freeze({ engine: graph.engine, rejected: graph.rejected }) : null,
    vector: vector ? Object.freeze({ engine: vector.engine, rejected: vector.rejected }) : null,
    fusion: graph && vector ? Object.freeze({ strategy: ir.fusion.strategy }) : null
  });
}

export function retrievalEngineCapabilities({
  apacheAge = { available: false, features: [] },
  postgresqlRecursive = { available: false, features: [] },
  postgresqlVector = { available: false, features: [] }
} = {}) {
  return {
    "apache-age": { available: Boolean(apacheAge.available), features: [...new Set(apacheAge.features ?? [])] },
    "postgresql-recursive": { available: Boolean(postgresqlRecursive.available), features: [...new Set(postgresqlRecursive.features ?? [])] },
    "postgresql-vector": { available: Boolean(postgresqlVector.available), features: [...new Set(postgresqlVector.features ?? [])] }
  };
}
