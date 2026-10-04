import test from "node:test";
import assert from "node:assert/strict";
import {createGraphApiServer} from "../../packages/graph-api/index.mjs";

test("Graph API requires bearer authentication",async()=>{
  const pool={connect:async()=>{throw new Error("database must not be touched")}};
  const server=createGraphApiServer({pool,jwtSecret:"secret"});
  const address=await server.listen();
  const response=await fetch(`http://${address.address}:${address.port}/v1/graph/query`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ir:{}})});
  assert.equal(response.status,401);
  const payload=await response.json();
  assert.equal(payload.error.code,"UNAUTHORIZED");
  assert.ok(payload.error.request_id);
  await server.close();
});

test("Graph API rejects unknown routes before database access",async()=>{
  const pool={connect:async()=>{throw new Error("database must not be touched")}};
  const server=createGraphApiServer({pool,jwtSecret:"secret"});
  const address=await server.listen();
  const response=await fetch(`http://${address.address}:${address.port}/v1/graph/cypher`);
  assert.equal(response.status,404);
  await server.close();
});
