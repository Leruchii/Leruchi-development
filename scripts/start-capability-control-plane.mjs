import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { createCapabilityControlPlane } from "../packages/capability-control-plane/service.mjs";
import { createPostgresCapabilityStore } from "../packages/capability-control-plane/postgres-store.mjs";

function required(name) {
  const value = process.env[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(name + " is required");
  return value;
}
const issuer = required("LERUCHI_CONTROL_PLANE_ISSUER");
const keyId = required("LERUCHI_CAPABILITY_KEY_ID");
const privateKey = readFileSync(required("LERUCHI_CAPABILITY_PRIVATE_KEY_PATH"), "utf8");
const internalToken = required("LERUCHI_CONTROL_PLANE_INTERNAL_TOKEN");
const databaseUrl = required("LERUCHI_CONTROL_PLANE_DATABASE_URL");
const adapterPath = pathToFileURL(resolve(required("LERUCHI_CONTROL_PLANE_ADAPTER_MODULE"))).href;
const adapter = await import(adapterPath);
if (typeof adapter.authenticateCaller !== "function" || typeof adapter.authorizeGrant !== "function") {
  throw new Error("Adapter must export authenticateCaller and authorizeGrant functions");
}
const pool = new Pool({ connectionString: databaseUrl });
await pool.query("SELECT 1");
const service = createCapabilityControlPlane({
  issuer, audience: process.env.LERUCHI_CAPABILITY_AUDIENCE ?? "leruchi", keyId, privateKey,
  internalBearerToken: internalToken, store: createPostgresCapabilityStore(pool),
  authenticateCaller: adapter.authenticateCaller, authorizeGrant: adapter.authorizeGrant
});
const host = process.env.LERUCHI_CONTROL_PLANE_HOST ?? "127.0.0.1";
const port = Number(process.env.LERUCHI_CONTROL_PLANE_PORT ?? "4101");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid control-plane TCP port");
const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  void service.handle(req, res);
});
await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(port, host, () => { server.removeListener("error", rejectListen); resolveListen(); });
});
process.stdout.write("leruchi-capability-control-plane-ready\n");
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await new Promise(resolveClose => server.close(resolveClose));
  await pool.end();
}
process.on("SIGINT", () => { void shutdown().then(() => process.exit(0)); });
process.on("SIGTERM", () => { void shutdown().then(() => process.exit(0)); });
