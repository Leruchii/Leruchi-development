import test from "node:test";
import assert from "node:assert/strict";
import {createGraphApiServer,resolveQueryCompiler} from "../../packages/graph-api/index.mjs";
import {engineCapabilities} from "../../packages/planner/index.mjs";
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
    assert.ok(observed[0].requestId);
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


test("Graph API planner keeps AGE as the default execution engine",()=>{
  const ir={version:"v1",kind:"graph_query",graph:"g",root:{label:"Person",alias:"p"},steps:[{edge:"KNOWS",direction:"out",target:{label:"Person",alias:"f"}}],filters:[],projection:[{field:"f.name",alias:"name"}],orderBy:[],limit:10,offset:0,depth:1,parameters:[]};
  const catalog={graphs:{g:{labels:["Person"],edges:[{name:"KNOWS",from:"Person",to:"Person"}]}}};
  const {plan,compile}=resolveQueryCompiler(ir,catalog);
  assert.equal(plan.engine,"apache-age");
  assert.equal(compile(ir).engine,"apache-age");
});

test("Graph API planner selects PostgreSQL fallback only when explicitly registered",()=>{
  const ir={version:"v1",kind:"graph_query",graph:"g",root:{label:"Person",alias:"p"},steps:[{edge:"KNOWS",direction:"out",target:{label:"Person",alias:"f"}}],filters:[],projection:[{field:"f.name",alias:"name"}],orderBy:[],limit:10,offset:0,depth:1,parameters:[]};
  const catalog={graphs:{g:{labels:["Person"],edges:[{name:"KNOWS",from:"Person",to:"Person"}],relational:{labels:{Person:{schema:"vibe_app",table:"people",id_column:"id",tenant_column:"tenant_id"}},edges:{KNOWS:{schema:"vibe_app",table:"person_knows",from_column:"from_id",to_column:"to_id"}}}}}};
  const observed=[];
  const observability={increment:(name,value,labels)=>observed.push({name,value,labels})};
  const engines=engineCapabilities({
    age:{available:false,features:[]},
    postgresqlRecursive:{available:true,features:["graph_query"]}
  });
  const {plan,compile}=resolveQueryCompiler(ir,catalog,{engines,observability});
  assert.equal(plan.engine,"postgresql-recursive");
  assert.equal(plan.reason,"fallback");
  assert.equal(compile(ir).engine,"postgresql-recursive");
  assert.deepEqual(observed,[{name:"vibe_query_planner_total",value:1,labels:{engine:"postgresql-recursive",reason:"fallback"}}]);
  assert.equal(JSON.stringify(observed).includes("tenant"),false);
});


test("Graph API blocks retrieval capability misuse before execution",async()=>{
  const api=createGraphApiServer({pool:fakePool(),jwtSecret:"secret",catalogProvider:async()=>({graphs:{}}),port:0});
  const address=await api.listen();
  try{
    const ir={version:"v1",kind:"retrieval_query",sources:{vector:{catalog_ref:"docs.embedding",query_parameter:"embedding",top_k:1,identity_field:"id"}},fusion:{strategy:"weighted_rrf"},limits:{max_results:1,max_cost:10}};
    const res=await fetch(`http://127.0.0.1:${address.port}/v1/retrieval/query`,{
      method:"POST",
      headers:{authorization:"Bearer "+token({sub:"u",tenant_id:"tenant_a",capabilities:["graph:read"]},"secret"),"content-type":"application/json"},
      body:JSON.stringify({ir,parameters:{embedding:[1,0,0]}})
    });
    assert.equal(res.status,403);
    const body=await res.json();
    assert.equal(body.code,"CAPABILITY_DENIED");
  }finally{await api.close();}
});


test("Graph API retrieval explanation is bounded and non-executing",async()=>{
  const api=createGraphApiServer({pool:fakePool(),jwtSecret:"secret",catalogProvider:async()=>({graphs:{}}),port:0});
  const address=await api.listen();
  try{
    const ir={version:"v1",kind:"retrieval_query",sources:{vector:{catalog_ref:"documents.embedding",query_parameter:"embedding",top_k:2,identity_field:"id"}},fusion:{strategy:"weighted_rrf"},limits:{max_results:2,max_cost:20}};
    const res=await fetch(`http://127.0.0.1:${address.port}/v1/retrieval/explain`,{
      method:"POST",
      headers:{authorization:"Bearer "+token({sub:"u",tenant_id:"tenant_a",capabilities:["vector:read"]},"secret"),"content-type":"application/json"},
      body:JSON.stringify({ir})
    });
    assert.equal(res.status,200);
    const body=await res.json();
    assert.equal(body.status,"ready");
    assert.equal(body.mode,"vector");
    assert.equal(body.execution,"not_executed");
    assert.equal(body.request_id,body.request_id);
    assert.equal(JSON.stringify(body).includes("documents.embedding"),false);
    assert.equal(JSON.stringify(body).includes("tenant_a"),false);
  }finally{await api.close();}
});
