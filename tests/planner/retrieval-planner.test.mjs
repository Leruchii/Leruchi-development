import assert from "node:assert/strict";
import { planRetrieval, retrievalEngineCapabilities } from "../../packages/planner/retrieval.mjs";

const graph = { version:"v1", kind:"graph_query" };
const vector = { version:"v1", kind:"retrieval_query", sources:{vector:{catalog_ref:"docs",query_parameter:"embedding",identity_field:"id",top_k:5}}, fusion:{strategy:"weighted_rrf"}, limits:{max_results:10,max_cost:20} };
const hybrid = { ...vector, sources:{vector:vector.sources.vector, graph:{query:graph,identity_field:"id",candidate_limit:5}} };
const capabilities = retrievalEngineCapabilities({
  apacheAge:{available:true,features:["graph_query"]},
  postgresqlVector:{available:true,features:["vector"]}
});

assert.equal(planRetrieval({...vector},{capabilities}).mode,"vector");
assert.equal(planRetrieval({...hybrid},{capabilities}).mode,"hybrid");
assert.equal(planRetrieval({...hybrid},{capabilities}).graph.engine,"apache-age");
assert.equal(planRetrieval({...hybrid},{capabilities}).vector.engine,"postgresql-vector");

const fallback = planRetrieval({...hybrid},{capabilities:retrievalEngineCapabilities({postgresqlRecursive:{available:true,features:["graph_query"]},postgresqlVector:{available:true,features:["vector"]}})});
assert.equal(fallback.graph.engine,"postgresql-recursive");

assert.throws(()=>planRetrieval({...vector},{capabilities:retrievalEngineCapabilities()}),e=>e.code==="NO_RETRIEVAL_ENGINE");
assert.throws(()=>planRetrieval({version:"v2",kind:"retrieval_query",sources:{}},{capabilities}),e=>e.code==="INVALID_RETRIEVAL_IR");
console.log("retrieval planner tests passed");
