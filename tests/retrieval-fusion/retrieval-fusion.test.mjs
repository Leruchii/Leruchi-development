import test from "node:test";
import assert from "node:assert/strict";
import {normalizeRetrievalRows} from "../../packages/retrieval-contract/index.mjs";
import {fuseWeightedRRF} from "../../packages/retrieval-fusion/index.mjs";

const vector=normalizeRetrievalRows({
  rows:[["a","A",0.1],["b","B",0.2]],
  columns:["id","content","distance"],
  identityField:"id",
  source:"vector"
});
const graph=normalizeRetrievalRows({
  rows:[{id:"b",name:"B"},{id:"c",name:"C"}],
  columns:["id","name"],
  identityField:"id",
  source:"graph"
});

test("weighted RRF deterministically fuses canonical graph and vector candidates",()=>{
  const result=fuseWeightedRRF({vectorCandidates:vector,graphCandidates:graph,maxResults:3});
  assert.deepEqual(result.map(x=>x.candidate_id),["b","a","c"]);
  assert.equal(result[0].sources.vector.rank,2);
  assert.equal(result[0].sources.graph.rank,1);
});

test("fusion is deterministic when scores tie",()=>{
  const left=normalizeRetrievalRows({rows:[["a"],["b"]],columns:["id"],identityField:"id",source:"vector"});
  const right=normalizeRetrievalRows({rows:[["b"],["a"]],columns:["id"],identityField:"id",source:"graph"});
  const result=fuseWeightedRRF({vectorCandidates:left,graphCandidates:right,maxResults:2});
  assert.deepEqual(result.map(x=>x.candidate_id),["a","b"]);
});

test("candidate identity must be explicitly projected",()=>{
  assert.throws(()=>normalizeRetrievalRows({rows:[["A"]],columns:["content"],identityField:"id",source:"vector"}),/do not project/);
  assert.throws(()=>normalizeRetrievalRows({rows:[{content:"secret"}],columns:["content"],identityField:"id",source:"graph"}),/do not project/);
});

test("fusion rejects non-canonical candidates",()=>{
  assert.throws(()=>fuseWeightedRRF({vectorCandidates:[{id:"a",rank:1}],maxResults:2}),/canonical retrieval result contract/);
});

test("fusion rejects invalid weights and limits",()=>{
  assert.throws(()=>fuseWeightedRRF({vectorCandidates:[],vectorWeight:0}),/positive/);
  assert.throws(()=>fuseWeightedRRF({vectorCandidates:[],maxResults:1001}),/between 1 and 1000/);
});
