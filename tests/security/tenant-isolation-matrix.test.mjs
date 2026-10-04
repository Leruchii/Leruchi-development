import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {createGraphApiServer} from "../../packages/graph-api/index.mjs";

const SECRET = "secret";
const catalog = {graphs:{tenant_graph:{visibility:"tenant",tenantId:"tenant_a",labels:["Person"],edges:[]}}};

function token(payload){
  const enc=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const header=enc({alg:"HS256",typ:"JWT"});
  const body=enc(payload);
  return header+"."+body+"."+createHmac("sha256",SECRET).update(header+"."+body).digest("base64url");
}

function fakePool(){
  return {connect:async()=>({
    async query(){return {rows:[]};},
    release(){}
  })};
}

function queryIr(){
  return {version:"v1",kind:"graph_query",graph:"tenant_graph",root:{label:"Person",alias:"root"},steps:[],filters:[],projection:[{field:"root.name",alias:"name"}],orderBy:[],limit:1,offset:0,depth:0,parameters:[]};
}

function mutationIr(){
  return {version:"v1",kind:"graph_mutation",graph:"tenant_graph",operation:"create_vertex",target:{label:"Person"},properties:{name:"Alice"},parameters:[]};
}

async function start(){
  const observed=[];
  const api=createGraphApiServer({
    pool:fakePool(),
    jwtSecret:SECRET,
    catalogProvider:async context=>{observed.push(context);return catalog;},
    port:0
  });
  const address=await api.listen();
  return {api,observed,base:`http://127.0.0.1:${address.port}`};
}

test("tenant isolation matrix rejects anonymous, malformed, expired, and tenant-less credentials",async()=>{
  const {api,base}=await start();
  try{
    const cases=[
      {name:"anonymous",headers:{},body:JSON.stringify({ir:queryIr()})},
      {name:"malformed",headers:{authorization:"Bearer not-a-jwt","content-type":"application/json"},body:JSON.stringify({ir:queryIr()})},
      {name:"malformed jwt payload",headers:{authorization:"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.not-json.signature","content-type":"application/json"},body:JSON.stringify({ir:queryIr()})},
      {name:"expired",headers:{authorization:"Bearer "+token({sub:"u",tenant_id:"tenant_a",exp:1}),"content-type":"application/json"},body:JSON.stringify({ir:queryIr()})},
      {name:"missing tenant",headers:{authorization:"Bearer "+token({sub:"u",capabilities:["graph:read"]}),"content-type":"application/json"},body:JSON.stringify({ir:queryIr()})}
    ];
    for(const item of cases){
      const res=await fetch(base+"/v1/graph/query",{method:"POST",headers:item.headers,body:item.body});
      assert.equal(res.status,401,item.name);
      const body=await res.json();
      assert.equal(body.code,"UNAUTHORIZED",item.name);
    }
  }finally{await api.close();}
});

test("tenant isolation matrix separates capability denial from authentication",async()=>{
  const {api,base}=await start();
  try{
    const res=await fetch(base+"/v1/graph/query",{
      method:"POST",
      headers:{authorization:"Bearer "+token({sub:"u",tenant_id:"tenant_a",capabilities:[]}),"content-type":"application/json"},
      body:JSON.stringify({ir:queryIr()})
    });
    assert.equal(res.status,400);
    const body=await res.json();
    assert.equal(body.code,"VALIDATION_FAILED");
    assert.equal(body.details[0].code,"CAPABILITY_DENIED");
  }finally{await api.close();}
});

test("tenant isolation matrix keeps JWT tenant authoritative for Graph Query across tenant A and B",async()=>{
  const {api,base,observed}=await start();
  try{
    for(const tenant of ["tenant_a","tenant_b"]){
      const res=await fetch(base+"/v1/graph/query",{
        method:"POST",
        headers:{authorization:"Bearer "+token({sub:"u",tenant_id:tenant,capabilities:["graph:read"]}),"content-type":"application/json"},
        body:JSON.stringify({tenant_id:tenant==="tenant_a"?"tenant_b":"tenant_a",ir:queryIr()})
      });
      assert.equal(res.status,200,tenant);
      assert.equal(observed.at(-1).tenantId,tenant);
    }
  }finally{await api.close();}
});

test("tenant isolation matrix keeps JWT tenant authoritative for Graph Mutation and forbids tenant_id writes",async()=>{
  const {api,base,observed}=await start();
  try{
    const res=await fetch(base+"/v1/graph/mutations",{
      method:"POST",
      headers:{authorization:"Bearer "+token({sub:"u",tenant_id:"tenant_b",capabilities:["graph:write"]}),"content-type":"application/json"},
      body:JSON.stringify({tenant_id:"tenant_a",ir:mutationIr()})
    });
    assert.equal(res.status,200);
    assert.equal(observed.at(-1).tenantId,"tenant_b");

    const forbidden=mutationIr();
    forbidden.properties.tenant_id="tenant_a";
    const denied=await fetch(base+"/v1/graph/mutations",{
      method:"POST",
      headers:{authorization:"Bearer "+token({sub:"u",tenant_id:"tenant_b",capabilities:["graph:write"]}),"content-type":"application/json"},
      body:JSON.stringify({ir:forbidden})
    });
    assert.equal(denied.status,400);
    const body=await denied.json();
    assert.equal(body.code,"VALIDATION_FAILED");
    assert.ok(body.details.some(error=>error.code==="TENANT_FIELD_FORBIDDEN"));
  }finally{await api.close();}
});
