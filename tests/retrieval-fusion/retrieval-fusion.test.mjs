import test from "node:test";
import assert from "node:assert/strict";
import {fuseWeightedRRF} from "../../packages/retrieval-fusion/index.mjs";

test("weighted RRF deterministically fuses overlapping graph and vector candidates",()=>{
  const result=fuseWeightedRRF({
    vectorRows:[{id:"a",content:"A"},{id:"b",content:"B"}],
    graphRows:[{id:"b",name:"B"},{id:"c",name:"C"}],
    vectorWeight:1,graphWeight:1,maxResults:3
  });
  assert.deepEqual(result.map(x=>x.id),["b","a","c"]);
  assert.equal(result[0].sources.vector.rank,2);
  assert.equal(result[0].sources.graph.rank,1);
});

test("fusion is deterministic when scores tie",()=>{
  const result=fuseWeightedRRF({vectorRows:[{id:"b"},{id:"a"}],graphRows:[],maxResults:2});
  assert.deepEqual(result.map(x=>x.id),["a","b"]);
});

test("fusion fails closed when a candidate has no identity",()=>{
  assert.throws(()=>fuseWeightedRRF({vectorRows:[{content:"secret"}]}),/no candidate identity/);
});

test("fusion rejects invalid weights and limits",()=>{
  assert.throws(()=>fuseWeightedRRF({vectorRows:[],vectorWeight:0}),/positive/);
  assert.throws(()=>fuseWeightedRRF({vectorRows:[],maxResults:1001}),/between 1 and 1000/);
});
