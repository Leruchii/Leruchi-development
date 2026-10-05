import assert from "node:assert/strict";
import test from "node:test";
import {validateContextIR,hashContextIR} from "../../packages/context-ir/index.mjs";

const valid={version:"v1",kind:"context_request",purpose:"Answer a developer question about customer relationships",sources:[
  {type:"schema",catalog_ref:"public.customer"},
  {type:"query",ir:{version:"v1",kind:"graph_query"},limit:20,fields:["root.name"]}
],budget:{max_items:100,max_bytes:65536},freshness:{mode:"current"},output:{format:"hybrid",include_provenance:true,deduplicate:true}};

test("accepts canonical context request",()=>{assert.equal(validateContextIR(valid),valid);assert.match(hashContextIR(valid),/^[a-f0-9]{64}$/);});
test("rejects tenant override",()=>assert.throws(()=>validateContextIR({...valid,sources:[{type:"records",tenant_id:"other"}]}),/Tenant identity/));
test("rejects credentials",()=>assert.throws(()=>validateContextIR({...valid,sources:[{type:"records",authorization:"Bearer x"}]}),/credentials/));
test("rejects excessive source limit",()=>assert.throws(()=>validateContextIR({...valid,sources:[{type:"records",limit:1001}]}),/between 1 and 1000/));
test("rejects unbounded budget",()=>assert.throws(()=>validateContextIR({...valid,budget:{max_items:100,max_bytes:1048577}}),/1048576/));
test("rejects invalid freshness",()=>assert.throws(()=>validateContextIR({...valid,freshness:{mode:"bounded_stale"}}),/bounded_stale requires/));
test("hash is deterministic",()=>assert.equal(hashContextIR(valid),hashContextIR(JSON.parse(JSON.stringify(valid)))));
