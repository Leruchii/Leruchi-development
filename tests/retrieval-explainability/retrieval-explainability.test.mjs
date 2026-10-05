import test from "node:test";
import assert from "node:assert/strict";
import {explainRetrieval,evaluateRetrievalExplanation} from "../../packages/retrieval-explainability/index.mjs";

const context={trusted:true,tenantId:"tenant_a",capabilities:["graph:read","vector:read"]};
const graph={version:"v1",kind:"graph_query",graph:"security",root:{label:"Account",alias:"n"},steps:[],filters:[],projection:[{field:"n.id",alias:"id"}],limit:2,offset:0,depth:0,parameters:[]};
const hybrid={version:"v1",kind:"retrieval_query",sources:{
 graph:{query:graph,candidate_limit:2,identity_field:"id"},
 vector:{catalog_ref:"documents.embedding",query_parameter:"embedding",top_k:2,identity_field:"id"}
},fusion:{strategy:"weighted_rrf",vector_weight:1,graph_weight:1},limits:{max_results:2,max_cost:40}};

test("explanation is deterministic and engine-neutral",()=>{
  const a=explainRetrieval({ir:hybrid,context});
  const b=explainRetrieval({ir:hybrid,context});
  assert.deepEqual(a,b);
  assert.equal(a.mode,"hybrid");
  assert.equal(a.reason_code,"PLANNER_SELECTED_HYBRID");
  assert.match(a.ir_hash,/^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(a).includes("apache-age"),false);
  assert.equal(JSON.stringify(a).includes("postgresql"),false);
  assert.equal(JSON.stringify(a).includes("tenant_a"),false);
  assert.equal(JSON.stringify(a).includes("embedding"),false);
  assert.equal(JSON.stringify(a).includes("security"),false);
});

test("capability denial is explicit but bounded",()=>{
  const result=explainRetrieval({ir:hybrid,context:{...context,capabilities:["graph:read"]}});
  assert.equal(result.status,"rejected");
  assert.equal(result.reason_code,"RETRIEVAL_CAPABILITY_DENIED");
  assert.deepEqual(result.denied_sources,["vector"]);
  assert.equal(JSON.stringify(result).includes("tenant_a"),false);
  assert.equal(JSON.stringify(result).includes("documents.embedding"),false);
});

test("invalid retrieval requests fail closed without exposing payload",()=>{
  const result=explainRetrieval({ir:{version:"v1",kind:"retrieval_query",sources:{vector:{catalog_ref:"secret.embedding;DROP",query_parameter:"embedding",top_k:2,identity_field:"id"}},fusion:{strategy:"weighted_rrf"},limits:{max_results:2,max_cost:40}},context});
  assert.equal(result.reason_code,"RETRIEVAL_IR_INVALID");
  assert.equal(JSON.stringify(result).includes("secret.embedding"),false);
});

test("evaluation is deterministic and bounded",()=>{
  const explanation=explainRetrieval({ir:hybrid,context});
  assert.deepEqual(evaluateRetrievalExplanation(explanation,{mode:"hybrid",reason_code:"PLANNER_SELECTED_HYBRID",sources:{graph:true,vector:true}}),{
    version:"v1",pass:true,checks:[
      {name:"version",pass:true,reason_code:"EVALUATION_VERSION_MISMATCH"},
      {name:"status",pass:true,reason_code:"EVALUATION_NOT_READY"},
      {name:"mode",pass:true,reason_code:"EVALUATION_MODE_MISMATCH"},
      {name:"reason_code",pass:true,reason_code:"EVALUATION_REASON_MISMATCH"},
      {name:"sources",pass:true,reason_code:"EVALUATION_SOURCE_MISMATCH"}
    ]
  });
});
