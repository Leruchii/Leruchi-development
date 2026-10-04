import {CAPABILITIES,hasCapability} from "../capability-policy/index.mjs";
const DEFAULT_LIMITS = Object.freeze({ maxDepth: 6, maxResults: 1000, maxCost: 100 });
const ENGINE_KEYS = new Set(["cypher", "sql", "age", "query", "statement", "raw"]);

function makeError(code, message, path = []) {
  return { version: "v1", code, message, path };
}

function hasEngineFragment(value) {
  if (Array.isArray(value)) return value.some(hasEngineFragment);
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value)) {
    if (ENGINE_KEYS.has(key.toLowerCase()) || hasEngineFragment(child)) return true;
  }
  return false;
}

function validateStructure(ir) {
  const required = ["version","kind","graph","root","steps","filters","projection","orderBy","limit","offset","depth","parameters"];
  if (!ir || typeof ir !== "object" || Array.isArray(ir)) return [makeError("INVALID_IR","IR must be an object")];
  const errors = [];
  for (const key of required) {
    if (!(key in ir)) errors.push(makeError("INVALID_IR", "Missing required field: " + key, [key]));
  }
  if (ir.version !== "v1") errors.push(makeError("INVALID_IR_VERSION","Only Query IR v1 is accepted",["version"]));
  if (ir.kind !== "graph_query") errors.push(makeError("INVALID_IR_KIND","Only graph_query is accepted",["kind"]));
  if (hasEngineFragment(ir)) errors.push(makeError("ENGINE_FRAGMENT","Engine-specific query fragments are forbidden",[]));
  return errors;
}

export function calculateCost(ir) {
  return 1 +
    ir.steps.length * 10 +
    ir.filters.length * 5 +
    ir.projection.length * 2 +
    ir.orderBy.length * 3 +
    ir.depth * 10 +
    Math.ceil(ir.limit / 100) * 5;
}

function edgeExists(graph, edge, direction, sourceLabel, targetLabel) {
  return graph.edges?.some(item =>
    item.name === edge &&
    item.from === sourceLabel &&
    item.to === targetLabel &&
    (item.directions ?? ["out"]).includes(direction)
  );
}

export function validateQuery(ir, context, catalog, limits = DEFAULT_LIMITS) {
  const errors = validateStructure(ir);
  if (errors.length) return { ok: false, errors, cost: null };

  if (!context?.tenantId) errors.push(makeError("MISSING_TENANT_CONTEXT","Trusted tenant context is required",["context","tenantId"]));
  if (!hasCapability(context,CAPABILITIES.GRAPH_READ)) errors.push(makeError("CAPABILITY_DENIED","graph:read capability is required",["context","capabilities"]));
  if (context?.role === "service_role" && context?.trustedBackend !== true) {
    errors.push(makeError("SERVICE_ROLE_REQUIRES_TRUSTED_BACKEND","service_role is restricted to trusted backend execution",["context","trustedBackend"]));
  }

  const graph = catalog?.graphs?.[ir.graph];
  if (!graph) {
    errors.push(makeError("UNKNOWN_GRAPH","Graph is not present in the Schema Catalog",["graph"]));
  } else {
    if (graph.visibility === "tenant" && graph.tenantId !== context.tenantId) {
      errors.push(makeError("GRAPH_ACCESS_DENIED", "Graph is not authorized for the current tenant", ["graph"]));
    }
    if (!graph.labels?.includes(ir.root.label)) {
      errors.push(makeError("UNKNOWN_LABEL","Root label is not present in the Schema Catalog",["root","label"]));
    }
    let sourceLabel = ir.root.label;
    for (let i = 0; i < ir.steps.length; i += 1) {
      const step = ir.steps[i];
      if (!graph.labels?.includes(step.target.label)) {
        errors.push(makeError("UNKNOWN_LABEL","Traversal target label is not present in the Schema Catalog",["steps",i,"target","label"]));
      }
      if (!graph.edges?.some(edge => edge.name === step.edge)) {
        errors.push(makeError("UNKNOWN_EDGE","Traversal edge is not present in the Schema Catalog",["steps",i,"edge"]));
      } else if (!edgeExists(graph, step.edge, step.direction, sourceLabel, step.target.label)) {
        errors.push(makeError("INVALID_TRAVERSAL","Edge direction or label endpoints are not allowed",["steps",i]));
      }
      sourceLabel = step.target.label;
    }
  }

  const declared = new Map();
  for (let i = 0; i < ir.parameters.length; i += 1) {
    const param = ir.parameters[i];
    if (declared.has(param.name)) {
      errors.push(makeError("DUPLICATE_PARAMETER","Parameter names must be unique",["parameters",i,"name"]));
    }
    declared.set(param.name, param.type);
  }

  const refs = [];
  const visit = (value, path = []) => {
    if (Array.isArray(value)) value.forEach((child,index) => visit(child,[...path,index]));
    else if (value && typeof value === "object") {
      if (typeof value.param === "string") refs.push({ name: value.param, path });
      Object.entries(value).forEach(([key,child]) => visit(child,[...path,key]));
    }
  };
  visit(ir.filters);
  for (const ref of refs) {
    if (!declared.has(ref.name)) {
      errors.push(makeError("UNDECLARED_PARAMETER","Parameter " + ref.name + " is not declared",ref.path));
    }
  }

  if (ir.depth > limits.maxDepth) {
    errors.push(makeError("DEPTH_EXCEEDED","Depth exceeds maximum of " + limits.maxDepth,["depth"]));
  }
  if (ir.limit > limits.maxResults) {
    errors.push(makeError("RESULT_LIMIT_EXCEEDED","Result limit exceeds maximum of " + limits.maxResults,["limit"]));
  }

  const cost = calculateCost(ir);
  if (cost > limits.maxCost) {
    errors.push(makeError("COST_EXCEEDED","Query cost " + cost + " exceeds maximum of " + limits.maxCost,[]));
  }

  return errors.length ? { ok: false, errors, cost } : { ok: true, errors: [], cost };
}

export { DEFAULT_LIMITS };
