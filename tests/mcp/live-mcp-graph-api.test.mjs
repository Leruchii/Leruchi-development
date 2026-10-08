import test from "node:test";
import assert from "node:assert/strict";
import {signTestCapabilityGrant} from "../fixtures/capability-grant-test-key.mjs";
import {handleMcpMessage} from "../../packages/mcp-server/index.mjs";

const base=(process.env.LERUCHI_API_URL??"").replace(/\/$/,"");
const token=()=>signTestCapabilityGrant({
  sub:"stage-14-mcp",jti:"stage-14-grant-1",tenant_id:"vibe_tenant_a",capabilities:["graph:read"]
});

const ir={
  version:"v1",kind:"graph_query",graph:"vibe_security",
  root:{label:"Account",alias:"n"},steps:[],filters:[],
  projection:[{field:"n.name",alias:"name"}],
  orderBy:[{field:"n.name",direction:"asc"}],limit:100,offset:0,depth:0,parameters:[]
};

test("MCP schema discovery and graph query traverse the live Graph API security boundary",async()=>{
  assert.ok(base,"LERUCHI_API_URL is required");
  process.env.LERUCHI_API_URL=base;
  process.env.LERUCHI_MCP_ACCESS_TOKEN=token();

  const schema=await handleMcpMessage({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"schema.discover",arguments:{}}});
  assert.equal(schema.result.isError,undefined);
  assert.equal(schema.result.content[0].type,"text");
  const catalog=JSON.parse(schema.result.content[0].text);
  assert.equal(catalog.version,"v1");
  assert.ok(catalog.graphs.vibe_security);

  const query=await handleMcpMessage({jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"graph.query",arguments:{ir}}});
  assert.equal(query.result.isError,undefined);
  const body=JSON.parse(query.result.content[0].text);
  assert.deepEqual(body.rows.map(row=>row.name),["A1","A2"]);

  const traversal=await handleMcpMessage({jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"graph.traverse",arguments:{ir}}});
  assert.equal(traversal.result.isError,undefined);
  const traversalBody=JSON.parse(traversal.result.content[0].text);
  assert.deepEqual(traversalBody.rows.map(row=>row.name),["A1","A2"]);
});

test("MCP live query remains tenant-authoritative when the agent supplies a conflicting tenant field",async()=>{
  process.env.LERUCHI_MCP_ACCESS_TOKEN=token();
  const response=await handleMcpMessage({
    jsonrpc:"2.0",id:4,method:"tools/call",
    params:{name:"graph.query",arguments:{tenant_id:"vibe_tenant_b",ir}}
  });
  assert.equal(response.result.isError,true);
  assert.match(response.result.content[0].text,/Tenant identity is derived/);
});
