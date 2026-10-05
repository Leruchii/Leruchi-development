import test from "node:test";
import assert from "node:assert/strict";
import {executeRetrieval} from "../../packages/retrieval-execution/index.mjs";

const context={trusted:true,tenantId:"tenant_a",role:"authenticated",capabilities:["graph:read","vector:read"],requestId:"r1"};
const ir={
  version:"v1",kind:"retrieval_query",
  sources:{
    vector:{catalog_ref:"documents.embedding",query_parameter:"embedding",top_k:2,identity_field:"id"},
    graph:{
      query:{version:"v1",kind:"graph_query",graph:"security",root:{label:"Account",alias:"n"},steps:[],filters:[],projection:[{field:"n.id",alias:"id"},{field:"n.name",alias:"name"}],limit:2,offset:0,depth:0,parameters:[]},
      candidate_limit:2,identity_field:"id"
    }
  },
  fusion:{strategy:"weighted_rrf",vector_weight:1,graph_weight:1},
  limits:{max_results:2,max_cost:40}
};

function deps(calls){
  return {
    validate:()=>({ok:true,errors:[],cost:5}),
    compile:()=>({}),
    executeGraph:async args=>{calls.push(["graph",args.requestParameters]);return {columns:["id","name"],rows:[{id:"g1",name:"Graph"}],count:1};},
    executeVector:async args=>{calls.push(["vector",args.embedding,args.maxCost]);return {columns:["id","content","distance"],rows:[["g1","Vector",0.1]],count:1};}
  };
}

test("executes graph and vector branches under one trusted retrieval contract",async()=>{
  const calls=[];
  const result=await executeRetrieval({ir,context,catalog:{},requestParameters:{embedding:[1,0,0]},db:{},...deps(calls)});
  assert.equal(result.count,1);
  assert.equal(result.rows[0].candidate_id,"g1");
  assert.equal(result.cost.total,7);
  assert.deepEqual(result.explain.fusion,{strategy:"weighted_rrf",vector_weight:1,graph_weight:1});
  assert.deepEqual(result.explain.candidate_limits,{max_results:2,max_cost:40});
  assert.deepEqual(calls.map(x=>x[0]),["graph","vector"]);
});

test("selects the capability-registered recursive compiler when explicitly preferred",async()=>{
  const calls=[];
  let selected;
  const result=await executeRetrieval({
    ir:{...ir,sources:{graph:ir.sources.graph}},
    context,catalog:{},requestParameters:{},db:{},
    ...deps(calls),
    compile:()=>{selected="age";return {};},
    recursiveCompile:()=>{selected="recursive";return {};},
    executeGraph:async args=>{args.compile({});calls.push(["graph"]);return {columns:["id"],rows:[{id:"g1"}],count:1};},
    retrievalCapabilities:{
      "apache-age":{available:true,features:["graph_query"]},
      "postgresql-recursive":{available:true,features:["graph_query"]},
      "postgresql-vector":{available:false,features:[]}
    },
    preferredGraphEngines:["postgresql-recursive"]
  });
  assert.equal(result.plan.mode,"graph");
  assert.equal(JSON.stringify(result).includes("postgresql-recursive"),false);
  assert.equal(selected,"recursive");
  assert.deepEqual(calls.map(x=>x[0]),["graph"]);
});

test("rejects combined cost before any branch executes",async()=>{
  const calls=[];
  const expensive={...ir,limits:{max_results:2,max_cost:6}};
  await assert.rejects(()=>executeRetrieval({ir:expensive,context,catalog:{},requestParameters:{embedding:[1,0,0]},db:{},...deps(calls)}),/Combined retrieval exceeds/);
  assert.deepEqual(calls,[]);
});

test("requires the vector query parameter before execution",async()=>{
  const calls=[];
  await assert.rejects(()=>executeRetrieval({ir,context,catalog:{},requestParameters:{},db:{},...deps(calls)}),/Vector query parameter is missing/);
  assert.deepEqual(calls,[]);
});

test("fails closed for untrusted execution context",async()=>{
  await assert.rejects(()=>executeRetrieval({ir,context:{...context,trusted:false},catalog:{},requestParameters:{embedding:[1,0,0]},db:{},...deps([])}),/Trusted execution context/);
});


test("retrieval telemetry records the planned mode without leaking retrieval internals",async()=>{
  const observations=[];
  await executeRetrieval({
    ir:{...ir,sources:{vector:ir.sources.vector}},
    context,catalog:{},requestParameters:{embedding:[1,0,0]},db:{},...deps([]),
    observability:{observe:(name,value,labels)=>observations.push({name,value,labels})}
  });
  assert.equal(observations[0].name,"vibe_retrieval_duration_ms");
  assert.equal(observations[0].labels.source,"vector");
  assert.equal(JSON.stringify(observations).includes("tenant_a"),false);
  assert.equal(JSON.stringify(observations).includes("documents.embedding"),false);
  assert.equal(JSON.stringify(observations).includes("[1,0,0]"),false);
});
