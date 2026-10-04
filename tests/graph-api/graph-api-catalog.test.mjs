import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {createGraphApiServer} from "../../packages/graph-api/index.mjs";

function token(tenant_id,secret="catalog-test-secret"){
  const enc=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const header=enc({alg:"HS256",typ:"JWT"});
  const payload=enc({sub:"catalog-test",tenant_id,exp:Math.floor(Date.now()/1000)+300,capabilities:["graph:read"]});
  return header+"."+payload+"."+createHmac("sha256",secret).update(header+"."+payload).digest("base64url");
}

test("Graph API exposes the authenticated tenant-scoped Schema Catalog",async()=>{
  const secret="catalog-test-secret";
  const calls=[];
  const catalogProvider=async context=>{
    calls.push(context);
    return {version:"v1",graphs:{tenant_graph:{visibility:"tenant",tenantId:context.tenantId,labels:["Account"],edges:[]}}};
  };
  const pool={connect:async()=>{throw new Error("database connection must not be required for catalog discovery");}};
  const api=createGraphApiServer({pool,jwtSecret:secret,catalogProvider,port:0});
  const address=await api.listen();
  try{
    const response=await fetch(`http://127.0.0.1:${address.port}/v1/schema/catalog`,{headers:{authorization:"Bearer "+token("tenant_a",secret)}});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{version:"v1",graphs:{tenant_graph:{visibility:"tenant",tenantId:"tenant_a",labels:["Account"],edges:[]}}});
    assert.equal(calls.length,1);
    assert.equal(calls[0].tenantId,"tenant_a");
    assert.equal(calls[0].trusted,true);
  }finally{await api.close();}
});

test("Graph API catalog discovery requires authentication",async()=>{
  const api=createGraphApiServer({pool:{connect:async()=>{throw new Error("must not connect");}},jwtSecret:"catalog-test-secret",catalogProvider:async()=>({version:"v1",graphs:{}}),port:0});
  const address=await api.listen();
  try{
    const response=await fetch(`http://127.0.0.1:${address.port}/v1/schema/catalog`);
    assert.equal(response.status,401);
  }finally{await api.close();}
});
