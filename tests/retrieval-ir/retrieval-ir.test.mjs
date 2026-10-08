import test from "node:test";
import assert from "node:assert/strict";
import {canonicalizeRetrievalIR,hashRetrievalIR,validateRetrievalIR} from "../../packages/retrieval-ir/index.mjs";

const base={
  version:"v1",kind:"retrieval_query",
  sources:{
    vector:{catalog_ref:"documents.embedding",query_parameter:"embedding",top_k:20,identity_field:"id"},
    graph:{query:{version:"v1",kind:"graph_query",graph:"leruchi_security",root:{label:"Account",alias:"n"},steps:[],filters:[],projection:[{field:"n.id",alias:"id"},{field:"n.name",alias:"name"}],limit:20,offset:0,depth:2,parameters:[]},candidate_limit:20,identity_field:"id"}
  },
  fusion:{strategy:"weighted_rrf",vector_weight:1,graph_weight:1},
  limits:{max_results:20,max_cost:40}
};

test("retrieval IR validates as an engine-neutral hybrid contract",()=>{
  assert.equal(validateRetrievalIR(base),base);
  assert.match(hashRetrievalIR(base),/^[a-f0-9]{64}$/);
});

test("canonical serialization is deterministic",()=>{
  const reordered={...base,limits:{max_cost:40,max_results:20},fusion:{graph_weight:1,vector_weight:1,strategy:"weighted_rrf"}};
  assert.equal(canonicalizeRetrievalIR(base),canonicalizeRetrievalIR(reordered));
});

test("tenant identity cannot be supplied through graph retrieval input",()=>{
  assert.throws(()=>validateRetrievalIR({...base,sources:{...base.sources,graph:{...base.sources.graph,query:{...base.sources.graph.query,tenant_id:"tenant_b"}}}}),/tenant override/);
});

test("retrieval budgets fail closed",()=>{
  assert.throws(()=>validateRetrievalIR({...base,limits:{max_results:1001,max_cost:40}}),/between 1 and 1000/);
  assert.throws(()=>validateRetrievalIR({...base,limits:{max_results:20,max_cost:101}}),/between 1 and 100/);
  assert.throws(()=>validateRetrievalIR({...base,sources:{...base.sources,vector:{...base.sources.vector,query_parameter:"embedding;DROP"}}}),/safe identifier/);
  assert.throws(()=>validateRetrievalIR({...base,sources:{...base.sources,vector:{...base.sources.vector,catalog_ref:"documents;DROP"}}}),/safe catalog reference/);
});
