import {createAgentSurface} from "./agent.mjs";
import {createContextBuilder} from "./context.mjs";
import {RetrievalBuilder} from "./retrieval.mjs";
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FIELD = /^[A-Za-z_][A-Za-z0-9_.]*$/;
const DIRECTIONS = new Set(["out", "in", "both"]);
const FILTER_OPS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains", "starts_with", "is_null"]);
const PARAM_TYPES = new Set(["string", "integer", "number", "boolean", "uuid", "vector", "json"]);
const MUTATIONS = new Set(["create_vertex", "create_edge", "update_vertex", "update_edge", "delete_vertex", "delete_edge"]);

function assertIdentifier(value, name) {
  if (typeof value !== "string" || !IDENT.test(value)) throw new VibeClientError("INVALID_IDENTIFIER", `${name} must be a valid identifier`);
  return value;
}
function assertField(value) {
  if (typeof value !== "string" || !FIELD.test(value)) throw new VibeClientError("INVALID_FIELD", "Field must be a valid Vibe field");
  return value;
}
function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
function normalizeField(field, rootAlias) {
  assertField(field);
  return field.includes(".") ? field : `${rootAlias}.${field}`;
}
function valueForIr(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.hasOwn(value, "param") && Object.keys(value).every(key => key === "param" || key === "type")) {
      assertIdentifier(value.param, "parameter");
      return { param: value.param };
    }
    throw new VibeClientError("INVALID_VALUE", "Query values must be primitives, arrays, or parameter references");
  }
  return clone(value);
}

export class VibeClientError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "VibeClientError";
    this.code = code;
    this.details = details;
  }
  toJSON() {
    return { version: "v1", code: this.code, message: this.message, ...(this.details === undefined ? {} : { details: this.details }) };
  }
}

export function param(name, type) {
  assertIdentifier(name, "Parameter name");
  if (!PARAM_TYPES.has(type)) throw new VibeClientError("INVALID_PARAMETER_TYPE", "Unsupported parameter type");
  return Object.freeze({ param: name, type });
}

class QueryBuilder {
  constructor(client, graph, label, alias = "root") {
    assertIdentifier(graph, "Graph");
    assertIdentifier(label, "Root label");
    assertIdentifier(alias, "Root alias");
    this.client = client;
    this.ir = {
      version: "v1", kind: "graph_query", graph,
      root: { label, alias }, steps: [], filters: [], projection: [],
      orderBy: [], limit: 100, offset: 0, depth: 0, parameters: []
    };
    this.bound = {};
  }
  select(fields) {
    const list = Array.isArray(fields) ? fields : [fields];
    if (!list.length) throw new VibeClientError("EMPTY_PROJECTION", "At least one projection is required");
    this.ir.projection = list.map(item => {
      const spec = typeof item === "string" ? { field: item } : item;
      const field = normalizeField(spec.field, this.ir.root.alias);
      const alias = spec.alias === undefined ? undefined : assertIdentifier(spec.alias, "Projection alias");
      return alias ? { field, alias } : { field };
    });
    return this;
  }
  traverse(edge, direction, targetLabel, targetAlias) {
    assertIdentifier(edge, "Edge");
    if (!DIRECTIONS.has(direction)) throw new VibeClientError("INVALID_DIRECTION", "Direction must be out, in, or both");
    assertIdentifier(targetLabel, "Target label");
    const alias = targetAlias ?? `node${this.ir.steps.length + 1}`;
    assertIdentifier(alias, "Target alias");
    this.ir.steps.push({ edge, direction, target: { label: targetLabel, alias } });
    this.ir.depth = this.ir.steps.length;
    return this;
  }
  where(field, op, value) {
    assertField(field);
    if (!FILTER_OPS.has(op)) throw new VibeClientError("INVALID_FILTER_OPERATOR", "Unsupported filter operator");
    if (op === "is_null" && value !== null && typeof value !== "boolean") {
      throw new VibeClientError("INVALID_FILTER_VALUE", "is_null expects null or a boolean");
    }
    this.ir.filters.push({ field: normalizeField(field, this.ir.root.alias), op, value: valueForIr(value) });
    return this;
  }
  eq(field, value) { return this.where(field, "eq", value); }
  neq(field, value) { return this.where(field, "neq", value); }
  gt(field, value) { return this.where(field, "gt", value); }
  gte(field, value) { return this.where(field, "gte", value); }
  lt(field, value) { return this.where(field, "lt", value); }
  lte(field, value) { return this.where(field, "lte", value); }
  contains(field, value) { return this.where(field, "contains", value); }
  startsWith(field, value) { return this.where(field, "starts_with", value); }
  isNull(field, value = true) { return this.where(field, "is_null", value); }
  bind(name, type, value, required = true) {
    assertIdentifier(name, "Parameter name");
    if (!PARAM_TYPES.has(type)) throw new VibeClientError("INVALID_PARAMETER_TYPE", "Unsupported parameter type");
    if (this.ir.parameters.some(p => p.name === name)) throw new VibeClientError("DUPLICATE_PARAMETER", "Parameter names must be unique");
    this.ir.parameters.push({ name, type, required });
    this.bound[name] = value;
    return { param: name };
  }
  orderBy(field, direction = "asc") {
    assertField(field);
    if (!["asc", "desc"].includes(direction)) throw new VibeClientError("INVALID_ORDER_DIRECTION", "Order direction must be asc or desc");
    this.ir.orderBy.push({ field: normalizeField(field, this.ir.root.alias), direction });
    return this;
  }
  limit(value) {
    if (!Number.isInteger(value) || value < 1 || value > 1000) throw new VibeClientError("INVALID_LIMIT", "Limit must be an integer between 1 and 1000");
    this.ir.limit = value;
    return this;
  }
  offset(value) {
    if (!Number.isInteger(value) || value < 0) throw new VibeClientError("INVALID_OFFSET", "Offset must be a non-negative integer");
    this.ir.offset = value;
    return this;
  }
  depth(value) {
    if (!Number.isInteger(value) || value < 0 || value > 6) throw new VibeClientError("INVALID_DEPTH", "Depth must be an integer between 0 and 6");
    this.ir.depth = value;
    return this;
  }
  build() {
    if (!this.ir.projection.length) throw new VibeClientError("EMPTY_PROJECTION", "Call select() before executing a query");
    return { ir: clone(this.ir), parameters: clone(this.bound) };
  }
  async execute(parameters = undefined) {
    const built = this.build();
    const merged = { ...built.parameters, ...(parameters ?? {}) };
    return this.client.request("query", { ir: built.ir, parameters: merged });
  }
}

class MutationBuilder {
  constructor(client, graph, operation, target) {
    assertIdentifier(graph, "Graph");
    if (!MUTATIONS.has(operation)) throw new VibeClientError("INVALID_OPERATION", "Unsupported graph mutation");
    this.client = client;
    this.ir = { version: "v1", kind: "graph_mutation", graph, operation, target: clone(target), parameters: [] };
    this.bound = {};
  }
  properties(properties) {
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) throw new VibeClientError("INVALID_PROPERTIES", "Properties must be an object");
    this.ir.properties = clone(properties);
    return this;
  }
  bind(name, type, value, required = true) {
    assertIdentifier(name, "Parameter name");
    if (!PARAM_TYPES.has(type)) throw new VibeClientError("INVALID_PARAMETER_TYPE", "Unsupported parameter type");
    if (this.ir.parameters.some(p => p.name === name)) throw new VibeClientError("DUPLICATE_PARAMETER", "Parameter names must be unique");
    this.ir.parameters.push({ name, type, required });
    this.bound[name] = value;
    return { param: name };
  }
  build() {
    return { ir: clone(this.ir), parameters: clone(this.bound) };
  }
  async execute(parameters = undefined) {
    const built = this.build();
    return this.client.request("mutation", { ir: built.ir, parameters: { ...built.parameters, ...(parameters ?? {}) } });
  }
}

export function createFetchTransport({ baseUrl, token, fetchImpl = globalThis.fetch, headers = {} }) {
  if (typeof baseUrl !== "string" || !baseUrl) throw new VibeClientError("INVALID_BASE_URL", "baseUrl is required");
  if (typeof fetchImpl !== "function") throw new VibeClientError("FETCH_UNAVAILABLE", "A fetch implementation is required");
  const root = baseUrl.replace(/\/$/, "");
  return {
    async request(kind, body) {
      const path = kind === "query" ? "/v1/graph/query" : kind === "mutation" ? "/v1/graph/mutations" : kind === "retrieval" ? "/v1/retrieval/query" : kind === "retrieval-explain" ? "/v1/retrieval/explain" : kind === "context-explain" ? "/v1/context/explain" : kind === "context-resolve" ? "/v1/context/resolve" : kind === "agent-intent-explain" ? "/v1/agent/intent/explain" : kind === "cross-modal-plan-explain" ? "/v1/agent/plan/explain" : kind === "agent-evaluate" ? "/v1/agent/evaluate" : (() => { throw new VibeClientError("INVALID_REQUEST_KIND", "Unsupported Vibe request kind"); })();
      const response = await fetchImpl(root + path, {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
        body: JSON.stringify(body)
      });
      let payload;
      try { payload = await response.json(); } catch { payload = undefined; }
      if (!response.ok) {
        throw new VibeClientError(payload?.code ?? "HTTP_ERROR", payload?.message ?? `Vibe request failed with HTTP ${response.status}`, payload?.details);
      }
      return payload;
    }
  };
}

export function createClient(options = {}) {
  if (!options.transport && !options.baseUrl) throw new VibeClientError("MISSING_TRANSPORT", "Provide baseUrl or a custom transport");
  const transport = options.transport ?? createFetchTransport(options);
  const client = {
    graph(graph) {
      return {
        query(label, alias = "root") { return new QueryBuilder(client, graph, label, alias); },
        createVertex(label, properties = {}) {
          return new MutationBuilder(client, graph, "create_vertex", { label }).properties(properties);
        },
        createEdge(edge, from, to, properties = {}) {
          assertIdentifier(edge, "Edge");
          const normalizeEndpoint = (endpoint, name) => {
            if (!endpoint || typeof endpoint !== "object") throw new VibeClientError("INVALID_ENDPOINT", `${name} endpoint is required`);
            return { label: assertIdentifier(endpoint.label, `${name} label`), field: assertField(endpoint.field), value: valueForIr(endpoint.value) };
          };
          const target = { label: assertIdentifier(from.label, "From label"), edge, from: normalizeEndpoint(from, "From"), to: normalizeEndpoint(to, "To") };
          return new MutationBuilder(client, graph, "create_edge", target).properties(properties);
        },
        updateVertex(label, field, value) {
          return new MutationBuilder(client, graph, "update_vertex", { label: assertIdentifier(label, "Label"), field: assertField(field), value: valueForIr(value) });
        },
        updateEdge(edge, from, to) {
          return new MutationBuilder(client, graph, "update_edge", {
            label: assertIdentifier(from.label, "From label"), edge: assertIdentifier(edge, "Edge"),
            from: { label: assertIdentifier(from.label, "From label"), field: assertField(from.field), value: valueForIr(from.value) },
            to: { label: assertIdentifier(to.label, "To label"), field: assertField(to.field), value: valueForIr(to.value) }
          });
        },
        deleteVertex(label, field, value) {
          return new MutationBuilder(client, graph, "delete_vertex", { label: assertIdentifier(label, "Label"), field: assertField(field), value: valueForIr(value) });
        },
        deleteEdge(edge, from, to) {
          return new MutationBuilder(client, graph, "delete_edge", {
            label: assertIdentifier(from.label, "From label"), edge: assertIdentifier(edge, "Edge"),
            from: { label: assertIdentifier(from.label, "From label"), field: assertField(from.field), value: valueForIr(from.value) },
            to: { label: assertIdentifier(to.label, "To label"), field: assertField(to.field), value: valueForIr(to.value) }
          });
        }
      };
    },
    retrieval() { return new RetrievalBuilder(client); },
    context() { return createContextBuilder(client); },
    agent() { return createAgentSurface(client); },
    request(kind, body) { return transport.request(kind, body); },
    param
  };
  return client;
}

export {RetrievalBuilder,RetrievalBuilderError,createRetrievalBuilder} from "./retrieval.mjs";
