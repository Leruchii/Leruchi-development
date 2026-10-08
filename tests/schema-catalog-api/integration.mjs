import assert from "node:assert/strict";
import {Client} from "pg";
import {createHmac} from "node:crypto";
import {createPool, createSchemaCatalogServer} from "../../packages/schema-catalog-api/index.mjs";

const secret = "stage-11-test-secret";
const adminUrl = process.env.VIBE_ADMIN_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/leruchi";
const runtimeUrl = process.env.VIBE_RUNTIME_DATABASE_URL ?? "postgresql://vibe_runtime:runtime@127.0.0.1:5432/leruchi";

function token(tenant_id) {
  const enc=v=>Buffer.from(JSON.stringify(v)).toString("base64url");
  const h=enc({alg:"HS256",typ:"JWT"});
  const p=enc({sub:"stage-11",tenant_id,exp:Math.floor(Date.now()/1000)+300});
  const s=createHmac("sha256",secret).update(h+"."+p).digest("base64url");
  return h+"."+p+"."+s;
}

const admin=new Client({connectionString:adminUrl});
await admin.connect();
await admin.query("INSERT INTO vibe_meta.graph_catalog_registry (tenant_id,graph_name,object_kind,object_name,from_label,to_label,properties) VALUES ('tenant_a','api_private_a','label','PrivateA','','','{}'),('tenant_b','api_private_b','label','PrivateB','','','{}') ON CONFLICT DO NOTHING");
await admin.query("SELECT vibe_meta.refresh_schema_catalog()");
await admin.end();

const pool=createPool(runtimeUrl);
const api=createSchemaCatalogServer({pool,jwtSecret:secret,port:0});
const address=await api.listen();
const base="http://"+address.address+":"+address.port;

for (const tenant of ["tenant_a","tenant_b"]) {
  const response=await fetch(base+"/v1/schema/catalog",{headers:{authorization:"Bearer "+token(tenant)}});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.version,"v1");
  assert.ok(body.graphs.vibe_stage01);
  assert.ok(body.graphs[tenant==="tenant_a"?"api_private_a":"api_private_b"]);
  assert.equal(Boolean(body.graphs[tenant==="tenant_a"?"api_private_b":"api_private_a"]),false);
}

const unauthorized=await fetch(base+"/v1/schema/catalog");
assert.equal(unauthorized.status,401);

await api.close();
await pool.end();
console.log("stage-11-remote-schema-catalog-ok");
