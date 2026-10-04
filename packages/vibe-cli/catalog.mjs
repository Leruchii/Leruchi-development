// Stage 11 remote Schema Catalog contract (see knowledge/decisions/stage-11-cli.md).
//
// GET {baseUrl}{catalogPath}   (default catalogPath: /rpc/vibe_schema_catalog, served by PostgREST in the Supabase compatibility core)
// Authorization: Bearer $VIBE_TOKEN
// 200 -> { "catalog_version": "v1", "graphs": { "<graph>": { "labels": ["<Label>"], "edges": [{ "name": "<EDGE>", "from": "<Label>", "to": "<Label>" }] } } }
//
// The CLI validates the response before generating anything from it; it never trusts server output as code or SQL.

export const DEFAULT_CATALOG_PATH = "/rpc/vibe_schema_catalog";

const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const PATH_RE = /^\/[A-Za-z0-9_\-./]*$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const MAX_BYTES = 2_000_000;
const MAX_GRAPHS = 500;
const MAX_ITEMS = 5000;
const TIMEOUT_MS = 15000;

export class CatalogError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CatalogError";
    this.code = code;
  }
}

const isPlainObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

function assertName(value, what) {
  if (typeof value !== "string" || !IDENT.test(value) || FORBIDDEN_KEYS.has(value)) throw new CatalogError("INVALID_CATALOG", `Catalog contains an invalid ${what}`);
  return value;
}

export function validateCatalog(payload) {
  if (!isPlainObject(payload)) throw new CatalogError("INVALID_CATALOG", "Catalog response must be a JSON object");
  if (payload.catalog_version !== "v1") throw new CatalogError("UNSUPPORTED_CATALOG_VERSION", "Unsupported catalog_version; expected v1");
  if (!isPlainObject(payload.graphs)) throw new CatalogError("INVALID_CATALOG", "Catalog graphs must be an object");
  const graphNames = Object.keys(payload.graphs);
  if (graphNames.length > MAX_GRAPHS) throw new CatalogError("INVALID_CATALOG", "Catalog contains too many graphs");
  const graphs = Object.create(null);
  for (const graphName of graphNames.sort()) {
    assertName(graphName, "graph name");
    const graph = payload.graphs[graphName];
    if (!isPlainObject(graph) || !Array.isArray(graph.labels) || !Array.isArray(graph.edges)) throw new CatalogError("INVALID_CATALOG", "Each graph needs labels and edges arrays");
    if (graph.labels.length > MAX_ITEMS || graph.edges.length > MAX_ITEMS) throw new CatalogError("INVALID_CATALOG", "Catalog graph is too large");
    const labels = [...new Set(graph.labels.map(label => assertName(label, "label name")))].sort();
    const edges = graph.edges.map(edge => {
      if (!isPlainObject(edge)) throw new CatalogError("INVALID_CATALOG", "Catalog edges must be objects");
      return { name: assertName(edge.name, "edge name"), from: assertName(edge.from, "edge source label"), to: assertName(edge.to, "edge target label") };
    }).sort((a, b) => a.name.localeCompare(b.name) || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
    graphs[graphName] = { labels, edges };
  }
  return { catalog_version: "v1", graphs };
}

export function assertSafeTransport(baseUrl) {
  let parsed;
  try { parsed = new URL(baseUrl); } catch { throw new CatalogError("INVALID_BASE_URL", "Base URL is not a valid URL"); }
  if (parsed.protocol === "https:") return parsed;
  if (parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname)) return parsed;
  throw new CatalogError("INSECURE_TRANSPORT", "Refusing to send a bearer token over plain http to a non-loopback host; use https");
}

export async function fetchCatalog({ baseUrl, token, catalogPath = DEFAULT_CATALOG_PATH, fetchImpl = globalThis.fetch }) {
  if (!token) throw new CatalogError("MISSING_TOKEN", "VIBE_TOKEN is required to read the Schema Catalog");
  if (typeof catalogPath !== "string" || !PATH_RE.test(catalogPath) || catalogPath.includes("..") || catalogPath.includes("//")) throw new CatalogError("INVALID_CATALOG_PATH", "--catalog-path must be an absolute path without '..'");
  assertSafeTransport(baseUrl);
  const url = baseUrl.replace(/\/$/, "") + catalogPath;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) throw new CatalogError("CATALOG_REQUEST_FAILED", `Schema Catalog request failed with HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > MAX_BYTES) throw new CatalogError("INVALID_CATALOG", "Schema Catalog response is too large");
  let payload;
  try { payload = JSON.parse(text); } catch { throw new CatalogError("INVALID_CATALOG", "Schema Catalog response is not valid JSON"); }
  return validateCatalog(payload);
}
