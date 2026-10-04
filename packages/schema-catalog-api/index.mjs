import http from "node:http";
import {createHmac, timingSafeEqual} from "node:crypto";
import {Pool} from "pg";

function decodePart(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

export function verifyHs256Jwt(token, secret, now=Math.floor(Date.now()/1000)) {
  if (!token || !secret) { const error = new Error("Missing bearer token or JWT secret"); error.code = "UNAUTHORIZED"; throw error; }
  const parts = token.split(".");
  if (parts.length !== 3) { const error = new Error("Invalid JWT"); error.code = "UNAUTHORIZED"; throw error; }
  const [encodedHeader, encodedPayload, signature] = parts;
  const header = decodePart(encodedHeader);
  const payload = decodePart(encodedPayload);
  if (header.alg !== "HS256" || header.typ !== "JWT") { const error = new Error("Unsupported JWT"); error.code = "UNAUTHORIZED"; throw error; }
  const expected = createHmac("sha256", secret).update(encodedHeader + "." + encodedPayload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { const error = new Error("Invalid JWT signature"); error.code = "UNAUTHORIZED"; throw error; }
  if (payload.exp !== undefined && (!Number.isInteger(payload.exp) || payload.exp <= now)) { const error = new Error("Expired JWT"); error.code = "UNAUTHORIZED"; throw error; }
  if (typeof payload.tenant_id !== "string" || payload.tenant_id === "") { const error = new Error("JWT tenant_id claim is required"); error.code = "UNAUTHORIZED"; throw error; }
  return payload;
}

export function buildCatalog(rows, tenantId = null) {
  const graphs = {};
  for (const row of rows) {
    if (row.tenant_id !== "" && row.tenant_id !== tenantId) continue;
    const graph = graphs[row.graph_name] ??= {
      visibility: row.tenant_id === "" ? "shared" : "tenant",
      tenantId: row.tenant_id === "" ? null : row.tenant_id,
      labels: [],
      edges: []
    };
    if (row.graph_object_kind === "label") {
      graph.labels.push(row.object_name);
    } else if (row.graph_object_kind === "edge") {
      graph.edges.push({
        name: row.object_name,
        from: row.from_label ?? null,
        to: row.to_label ?? null,
        properties: row.properties ?? {}
      });
    }
  }
  for (const graph of Object.values(graphs)) {
    graph.labels.sort();
    graph.edges.sort((a,b) => a.name.localeCompare(b.name));
  }
  return {version:"v1", graphs};
}

export function createTenantCatalogProvider(pool) {
  if (!pool) throw new Error("pool is required");
  return async function catalogProvider(context) {
    if (!context?.tenantId) throw new Error("Trusted tenant context is required");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config($1, $2, true)", ["request.jwt.claims", JSON.stringify({
        tenant_id: context.tenantId,
        role: context.role ?? "authenticated",
        capabilities: context.capabilities ?? []
      })]);
      const result = await client.query(
        `SELECT object_name AS graph_name,
                tenant_id,
                metadata->>'graph_object_kind' AS graph_object_kind,
                parent_name AS object_name,
                metadata->>'from_label' AS from_label,
                metadata->>'to_label' AS to_label,
                metadata->'properties' AS properties
           FROM vibe_meta.schema_catalog_entries
          WHERE catalog_version = 'v1' AND object_kind = 'graph'
          ORDER BY object_name, parent_name, tenant_id`
      );
      await client.query("COMMIT");
      return buildCatalog(result.rows, context.tenantId);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally {
      client.release();
    }
  };
}

export function createSchemaCatalogServer({pool, jwtSecret, host="127.0.0.1", port=0}={}) {
  if (!pool) throw new Error("pool is required");
  if (!jwtSecret) throw new Error("jwtSecret is required");

  const catalogProvider = createTenantCatalogProvider(pool);
  const server = http.createServer(async (req,res) => {
    if (req.method !== "GET" || req.url !== "/v1/schema/catalog") {
      res.writeHead(404, {"content-type":"application/json"});
      res.end(JSON.stringify({error:{code:"NOT_FOUND",message:"Not found"}}));
      return;
    }
    try {
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer ")) throw new Error("Bearer token required");
      const claims = verifyHs256Jwt(auth.slice(7), jwtSecret);
      const catalog = await catalogProvider({
        tenantId: claims.tenant_id,
        role: claims.role ?? "authenticated",
        capabilities: Array.isArray(claims.capabilities) ? claims.capabilities : []
      });
      res.writeHead(200, {"content-type":"application/json","cache-control":"no-store"});
      res.end(JSON.stringify(catalog));
    } catch (error) {
      res.writeHead(401, {"content-type":"application/json"});
      res.end(JSON.stringify({error:{code:"UNAUTHORIZED",message:error.message}}));
    }
  });
  return {server, listen:() => new Promise(resolve => server.listen(port, host, () => resolve(server.address()))), close:() => new Promise(resolve => server.close(resolve))};
}

export function createPool(connectionString) {
  return new Pool({connectionString});
}
