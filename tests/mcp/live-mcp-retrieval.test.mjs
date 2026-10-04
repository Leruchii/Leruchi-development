import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {Pool} from "pg";
import {createGraphApiServer} from "../../packages/graph-api/index.mjs";
import {createTenantCatalogProvider} from "../../packages/schema-catalog-api/index.mjs";
import {handleMcpMessage} from "../../packages/mcp-server/index.mjs";

const secret=process.env.VIBE_JWT_SECRET??"stage-15-e2e-secret";
const runtimeUrl=process.env.VIBE_RUNTIME_DATABASE_URL;
const token=(tenant)=>{
  const enc=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const header=enc({alg:"HS256",typ:"JWT"});
  const payload=enc({sub:"stage-15-mcp",tenant_id:tenant,exp:Math.floor(Date.now()/1000)+300,capabilities:["graph:read","vector:read"]});
  const signing=header+"."+payload;
  return signing+"."+createHmac("sha256",secret).update(signing).digest("base64url");
};

const ir={
  version:"v1",kind:"retrieval_query",
  sources:{
    vector:{catalog_ref:"stage15.hybrid.embedding",query_parameter:"embedding",top_k:2,identity_field:"id"},
    graph:{
      query:{version:"v1",kind:"graph_query",graph:"vibe_security",root:{label:"Account",alias:"n"},steps:[],filters:[],projection:[{field:"n.name",alias:"id"}],orderBy:[{field:"n.name",direction:"asc"}],limit:2,offset:0,depth:0,parameters:[]},
      candidate_limit:2,identity_field:"id"
    }
  },
  fusion:{strategy:"weighted_rrf",vector_weight:1,graph_weight:1},
  limits:{max_results:2,max_cost:40}
};

test("MCP GraphRAG retrieval reaches the live Graph API and preserves tenant isolation",async()=>{
  assert.ok(runtimeUrl,"VIBE_RUNTIME_DATABASE_URL is required");
  const pool=new Pool({connectionString:runtimeUrl});
  const api=createGraphApiServer({pool,jwtSecret:secret,catalogProvider:createTenantCatalogProvider(pool),port:0});
  const address=await api.listen();
  process.env.VIBE_API_URL="http://127.0.0.1:"+address.port;
  try{
    process.env.VIBE_MCP_ACCESS_TOKEN=token("vibe_tenant_a");
    const a=await handleMcpMessage({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"retrieval.query",arguments:{ir,parameters:{embedding:[1,0,0]}}}});
    assert.equal(a.result.isError,undefined);
    const aBody=JSON.parse(a.result.content[0].text);
    assert.deepEqual(aBody.rows.map(row=>row.candidate_id),["A1","A2"]);

    process.env.VIBE_MCP_ACCESS_TOKEN=token("vibe_tenant_b");
    const b=await handleMcpMessage({jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"retrieval.query",arguments:{ir,parameters:{embedding:[1,0,0]}}}});
    assert.equal(b.result.isError,undefined);
    const bBody=JSON.parse(b.result.content[0].text);
    assert.deepEqual(bBody.rows.map(row=>row.candidate_id),["B1","B2"]);
  }finally{
    await api.close();
    await pool.end();
  }
});

test("MCP GraphRAG retrieval cannot supply tenant identity",async()=>{
  process.env.VIBE_API_URL=process.env.VIBE_API_URL??"http://127.0.0.1:1";
  process.env.VIBE_MCP_ACCESS_TOKEN=token("vibe_tenant_a");
  const response=await handleMcpMessage({jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"retrieval.query",arguments:{tenant_id:"vibe_tenant_b",ir}}});
  assert.equal(response.result.isError,true);
  assert.match(response.result.content[0].text,/Tenant identity is derived/);
});
