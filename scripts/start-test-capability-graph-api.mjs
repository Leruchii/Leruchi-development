import { Pool } from "pg";
import { createGraphApiServer } from "../packages/graph-api/index.mjs";
import { createControlPlaneRevocationVerifier } from "../packages/capability-policy/control-plane.mjs";

function required(name) {
  const value = process.env[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(name + " is required");
  return value;
}
const issuer = required("LERUCHI_CAPABILITY_ISSUER");
const databaseUrl = required("LERUCHI_RUNTIME_DATABASE_URL");
const controlPlaneUrl = required("LERUCHI_CAPABILITY_CONTROL_PLANE_URL");
const controlPlaneToken = required("LERUCHI_CAPABILITY_CONTROL_PLANE_TOKEN");
let publicKeys;
try { publicKeys = JSON.parse(required("LERUCHI_CAPABILITY_PUBLIC_KEYS")); }
catch { throw new Error("LERUCHI_CAPABILITY_PUBLIC_KEYS must be a JSON key-id map"); }
if (!publicKeys || typeof publicKeys !== "object" || Array.isArray(publicKeys) || Object.keys(publicKeys).length === 0) {
  throw new Error("At least one capability grant public key is required");
}
const port = Number(process.env.LERUCHI_GRAPH_API_PORT ?? "4100");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("LERUCHI_GRAPH_API_PORT must be a valid TCP port");
const pool = new Pool({ connectionString: databaseUrl });
const isGrantRevoked = createControlPlaneRevocationVerifier({ baseUrl: controlPlaneUrl, bearerToken: controlPlaneToken });
const catalog = { version: "v1", graphs: { vibe_security: { visibility: "shared", tenantId: null, labels: ["Account"], edges: [{ name: "KNOWS", from: "Account", to: "Account", properties: {} }] } } };
const api = createGraphApiServer({
  pool, jwtIssuer: issuer, jwtAudience: process.env.LERUCHI_CAPABILITY_AUDIENCE ?? "leruchi",
  capabilityPublicKeys: publicKeys, requireCapabilityGrant: true, isGrantRevoked,
  catalogProvider: async () => catalog, host: "127.0.0.1", port
});
const address = await api.listen();
process.stdout.write("LERUCHI_TEST_GRAPH_API_URL=http://127.0.0.1:" + address.port + "\n");
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await api.close();
  await pool.end();
}
process.on("SIGINT", () => { void shutdown().then(() => process.exit(0)); });
process.on("SIGTERM", () => { void shutdown().then(() => process.exit(0)); });
