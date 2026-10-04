import test from "node:test";
import assert from "node:assert/strict";
import {createGraphApiServer} from "../../packages/graph-api/index.mjs";
import {createHmac} from "node:crypto";

function fakePool(){
  return {connect:async()=>({query:async()=>({rows:[]}),release(){}})};
}
test("Graph API rejects missing bearer credentials",async()=>{
  const api=createGraphApiServer({pool:fakePool(),jwtSecret:"secret",catalogProvider:async()=>({graphs:{}}),port:0});
  const address=await api.listen();
  try{
    const res=await fetch(`http://127.0.0.1:${address.port}/v1/graph/query`,{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
    assert.equal(res.status,401);
    const body=await res.json();
    assert.equal(body.code,"UNAUTHORIZED");
  }finally{await api.close();}
});
test("Graph API health is public and versioned",async()=>{
  const api=createGraphApiServer({pool:fakePool(),jwtSecret:"secret",catalogProvider:async()=>({graphs:{}}),port:0});
  const address=await api.listen();
  try{
    const res=await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(res.status,200);
    assert.deepEqual(await res.json(),{version:"v1",status:"ok"});
  }finally{await api.close();}
});


function token(payload, secret) {
  const enc=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const header=enc({alg:"HS256",typ:"JWT"});
  const body=enc(payload);
  return header+"."+body+"."+createHmac("sha256",secret).update(header+"."+body).digest("base64url");
}

test("Graph API derives tenant context from JWT and does not trust request tenant fields", async()=>{
  const observed=[];
  const api=createGraphApiServer({
    pool:fakePool(),
    jwtSecret:"secret",
    catalogProvider:async context=>{observed.push(context);return {graphs:{g:{visibility:"shared",tenantId:null,labels:["Person"],edges:[]}}};},
    port:0
  });
  const address=await api.listen();
  try{
    const res=await fetch(`http://127.0.0.1:${address.port}/v1/graph/query`,{
      method:"POST",
      headers:{authorization:"Bearer "+token({sub:"u",tenant_id:"tenant_a",capabilities:["graph:read"]},"secret"),"content-type":"application/json"},
      body:JSON.stringify({tenant_id:"tenant_b",ir:{version:"v1",kind:"graph_query",graph:"g",root:{label:"Person",alias:"root"},steps:[],filters:[],projection:[{field:"root.name",alias:"name"}],orderBy:[],limit:1,offset:0,depth:0,parameters:[]},parameters:{}})
    });
    assert.notEqual(res.status,401);
    assert.equal(observed[0].tenantId,"tenant_a");
  } finally { await api.close(); }
});

test("Graph API rejects expired JWTs with 401", async()=>{
  const api=createGraphApiServer({pool:fakePool(),jwtSecret:"secret",catalogProvider:async()=>({graphs:{}}),port:0});
  const address=await api.listen();
  try{
    const res=await fetch(`http://127.0.0.1:${address.port}/v1/graph/query`,{
      method:"POST",
      headers:{authorization:"Bearer "+token({sub:"u",tenant_id:"tenant_a",exp:1},"secret"),"content-type":"application/json"},
      body:"{}"
    });
    assert.equal(res.status,401);
    const body=await res.json();
    assert.equal(body.code,"UNAUTHORIZED");
  }finally{await api.close();}
});
