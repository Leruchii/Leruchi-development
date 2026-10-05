import assert from "node:assert/strict";
import test from "node:test";
import {explainContext} from "../../packages/context-ir/explain.mjs";

const ir={version:"v1",kind:"context_request",purpose:"Explain a graph",sources:[{type:"schema",catalog_ref:"public.customer"}],budget:{max_items:10,max_bytes:4096},freshness:{mode:"current"}};

test("explains without execution",()=>{const result=explainContext({ir,context:{capabilities:["graph:read"]}});assert.equal(result.status,"ready");assert.equal(result.execution,"not_executed");assert.equal(result.request.valid,true);});
test("denies missing capability without execution",()=>{const result=explainContext({ir,context:{capabilities:[]}});assert.equal(result.status,"rejected");assert.equal(result.reason_code,"CONTEXT_CAPABILITY_DENIED");});
test("never exposes tenant identity",()=>{const result=explainContext({ir,context:{tenantId:"secret",capabilities:["graph:read"]}});assert.equal(JSON.stringify(result).includes("secret"),false);});

test("retrieval context explanation requires vector capability when requested",()=>{const retrieval={version:"v1",kind:"retrieval_query",sources:{vector:{catalog_ref:"docs.embedding",query_parameter:"embedding",top_k:1,identity_field:"id"}},fusion:{strategy:"weighted_rrf"},limits:{max_results:1,max_cost:10}};const result=explainContext({ir:{...ir,sources:[{type:"retrieval",ir:retrieval}]},context:{capabilities:["graph:read"]}});assert.equal(result.status,"rejected");assert.equal(result.reason_code,"CONTEXT_CAPABILITY_DENIED");});

test("records context explanation fails closed as unsupported",()=>{const result=explainContext({ir:{...ir,sources:[{type:"records",catalog_ref:"public.customer"}]},context:{capabilities:["graph:read"]}});assert.equal(result.status,"rejected");assert.equal(result.reason_code,"CONTEXT_SOURCE_UNSUPPORTED");});
