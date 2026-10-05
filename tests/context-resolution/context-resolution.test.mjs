import assert from "node:assert/strict";
import test from "node:test";
import {resolveContext,ContextResolutionError} from "../../packages/context-resolution/index.mjs";

const context={tenantId:"tenant-a",role:"authenticated",capabilities:["graph:read","vector:read"],requestId:"r1"};
const base={version:"v1",kind:"context_request",purpose:"Build bounded agent context",sources:[{type:"schema",catalog_ref:"public.customer"}],budget:{max_items:10,max_bytes:65536},freshness:{mode:"current"}};
const adapters={
  resolveSchema:async()=>({graphs:["customer"]}),
  executeQuery:async({limit})=>({rows:Array.from({length:Math.min(2,limit)},(_,i)=>({id:i})),count:Math.min(2,limit)}),
  executeRetrieval:async({limit})=>({rows:Array.from({length:Math.min(2,limit)},(_,i)=>({id:i})),count:Math.min(2,limit)})
};

test("resolves bounded schema context",async()=>{const result=await resolveContext({ir:base,context,...adapters});assert.equal(result.execution,"resolved");assert.equal(result.count,1);assert.equal(result.sources[0].type,"schema");});
test("preflights capability denial before data plane",async()=>{let calls=0;await assert.rejects(()=>resolveContext({ir:{...base,sources:[{type:"query",ir:{version:"v1",kind:"graph_query"}}]},context:{...context,capabilities:[]},resolveSchema:async()=>{calls++;},executeQuery:async()=>{calls++;},executeRetrieval:async()=>{calls++;}}),e=>e instanceof ContextResolutionError&&e.code==="CONTEXT_CAPABILITY_DENIED");assert.equal(calls,0);});
test("preflights unsupported records before data plane",async()=>{let calls=0;await assert.rejects(()=>resolveContext({ir:{...base,sources:[{type:"records",catalog_ref:"public.customer"}]},context,resolveSchema:async()=>{calls++;},executeQuery:async()=>{calls++;},executeRetrieval:async()=>{calls++;}}),e=>e.code==="CONTEXT_SOURCE_UNSUPPORTED");assert.equal(calls,0);});
test("requires vector capability for vector retrieval",async()=>{const retrieval={version:"v1",kind:"retrieval_query",sources:{vector:{catalog_ref:"public.embedding",query_parameter:"q",top_k:2,identity_field:"id"}},fusion:{strategy:"weighted_rrf"},limits:{max_results:2,max_cost:10}};await assert.rejects(()=>resolveContext({ir:{...base,sources:[{type:"retrieval",ir:retrieval}]},context:{...context,capabilities:["graph:read"]},...adapters}),e=>e.code==="CONTEXT_CAPABILITY_DENIED");});
test("enforces aggregate item budget",async()=>{const ir={...base,sources:[{type:"query",ir:{version:"v1",kind:"graph_query"},limit:2},{type:"query",ir:{version:"v1",kind:"graph_query"},limit:2}],budget:{max_items:3,max_bytes:65536}};const result=await resolveContext({ir,context,...adapters});assert.equal(result.count,3);assert.equal(result.sources[1].count,1);});
test("fails closed when byte budget is exceeded",async()=>{const huge="x".repeat(3000);await assert.rejects(()=>resolveContext({ir:{...base,budget:{max_items:10,max_bytes:1024}},context,...adapters,resolveSchema:async()=>({huge})}),e=>e.code==="CONTEXT_BYTE_BUDGET_EXCEEDED");});
test("rejects oversized parameter envelope before execution",async()=>{await assert.rejects(()=>resolveContext({ir:{...base,sources:[{type:"query",ir:{version:"v1",kind:"graph_query"}}]},context,...adapters,parameterSets:[{q:"x".repeat(70*1024)}]}),e=>e.code==="CONTEXT_PARAMETER_LIMIT_EXCEEDED");});
