import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {createGraphApiServer} from "../../packages/graph-api/index.mjs";
import {Pool} from "pg";

const secret="stage-02-e2e-secret";
const runtimeUrl=process.env.VIBE_RUNTIME_DATABASE_URL??"postgresql://vibe_runtime:runtime@127.0.0.1:5432/vibedb";

function token(tenant_id){
  const enc=v=>Buffer.from(JSON.stringify(v)).toString("base64url");
  const h=enc({alg:"HS256",typ:"JWT"});
  const p=enc({sub:"stage-02-e2e",tenant_id,exp:Math.floor(Date.now()/1000)+300,capabilities:["graph:read"]});
  return h+"."+p+"."+createHmac("sha256",secret).update(h+"."+p).digest("base64url");
}

const catalog={version:"v1",graphs:{vibe_security:{visibility:"shared",tenantId:null,labels:["Account"],edges:[{name:"KNOWS",from:"Account",to:"Account",properties:{}}]}}};
const ir={
  version:"v1",kind:"graph_query",graph:"vibe_security",
  root:{label:"Account",alias:"n"},steps:[],filters:[],projection:[{field:"n.name",alias:"name"}],
  orderBy:[{field:"n.name",direction:"asc"}],limit:100,offset:0,depth:0,parameters:[]
};

test("Graph API tenant claims reach PostgreSQL RLS and isolate AGE results",async()=>{
  const pool=new Pool({connectionString:runtimeUrl});
  const api=createGraphApiServer({pool,jwtSecret:secret,catalogProvider:async()=>catalog,port:0});
  const address=await api.listen();
  const base=`http://127.0.0.1:${address.port}`;
  try{
    for(const [tenant,expected] of [
      ["vibe_tenant_a",["A1","A2"]],
      ["vibe_tenant_b",["B1","B2"]]
    ]){
      const response=await fetch(base+"/v1/graph/query",{
        method:"POST",
        headers:{authorization:"Bearer "+token(tenant),"content-type":"application/json"},
        body:JSON.stringify({tenant_id:"attacker-controlled",ir})
      });
      assert.equal(response.status,200,tenant);
      const body=await response.json();
      assert.deepEqual(body.rows.map(row=>row.name).sort(),expected,tenant);
    }
  }finally{
    await api.close();
    await pool.end();
  }
});
