import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {verifyHs256Jwt, buildCatalog, createTenantCatalogProvider} from "../../packages/schema-catalog-api/index.mjs";

function token(payload, secret) {
  const enc = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = enc({alg:"HS256",typ:"JWT"});
  const body = enc(payload);
  const sig = createHmac("sha256", secret).update(header+"."+body).digest("base64url");
  return header+"."+body+"."+sig;
}

test("verifies tenant-bound HS256 tokens",()=>{
  const t=token({sub:"user-a",tenant_id:"tenant_a",exp:2000},"secret");
  assert.equal(verifyHs256Jwt(t,"secret",1000).tenant_id,"tenant_a");
  assert.throws(()=>verifyHs256Jwt(t,"wrong",1000),/Invalid JWT signature/);
});

test("rejects tokens without trusted tenant claim",()=>{
  const t=token({sub:"user-a"},"secret");
  assert.throws(()=>verifyHs256Jwt(t,"secret",1000),/tenant_id claim is required/);
});

test("builds deterministic graph catalog contract",()=>{
  const catalog=buildCatalog([
    {graph_name:"g",tenant_id:"",graph_object_kind:"label",object_name:"Person",from_label:null,to_label:null,properties:{}},
    {graph_name:"g",tenant_id:"",graph_object_kind:"edge",object_name:"KNOWS",from_label:"Person",to_label:"Person",properties:{}}
  ]);
  assert.deepEqual(catalog,{version:"v1",graphs:{g:{visibility:"shared",tenantId:null,labels:["Person"],edges:[{name:"KNOWS",from:"Person",to:"Person",properties:{}}]}}});
});


test("tenant catalog provider binds the verified tenant to PostgreSQL request context", async()=>{
  const calls=[];
  const client={
    async query(text,values){calls.push({text,values});if(String(text).startsWith("SELECT object_name"))return {rows:[{graph_name:"private_graph",tenant_id:"tenant_a",graph_object_kind:"label",object_name:"PrivateA",from_label:null,to_label:null,properties:{}}]};return {rows:[]};},
    release(){}
  };
  const provider=createTenantCatalogProvider({connect:async()=>client});
  const catalog=await provider({tenantId:"tenant_a",role:"authenticated",capabilities:["graph:read"]});
  assert.equal(catalog.graphs.private_graph.labels[0],"PrivateA");
  assert.equal(calls[1].values[1],JSON.stringify({tenant_id:"tenant_a",role:"authenticated",capabilities:["graph:read"]}));
});

test("catalog filters private graph metadata to the verified tenant",()=>{
  const catalog=buildCatalog([
    {graph_name:"shared",tenant_id:"",graph_object_kind:"label",object_name:"Public",from_label:null,to_label:null,properties:{}},
    {graph_name:"private_a",tenant_id:"tenant_a",graph_object_kind:"label",object_name:"PrivateA",from_label:null,to_label:null,properties:{}},
    {graph_name:"private_b",tenant_id:"tenant_b",graph_object_kind:"label",object_name:"PrivateB",from_label:null,to_label:null,properties:{}}
  ],"tenant_a");
  assert.deepEqual(Object.keys(catalog.graphs).sort(),["private_a","shared"]);
  assert.equal(catalog.graphs.private_a.labels[0],"PrivateA");
  assert.equal(catalog.graphs.private_b,undefined);
});
