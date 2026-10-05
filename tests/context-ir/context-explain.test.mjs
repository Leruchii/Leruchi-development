import assert from "node:assert/strict";
import test from "node:test";
import {explainContext} from "../../packages/context-ir/explain.mjs";

const ir={version:"v1",kind:"context_request",purpose:"Explain a graph",sources:[{type:"schema",catalog_ref:"public.customer"}],budget:{max_items:10,max_bytes:4096},freshness:{mode:"current"}};

test("explains without execution",()=>{const result=explainContext({ir,context:{capabilities:["graph:read"]}});assert.equal(result.status,"ready");assert.equal(result.execution,"not_executed");assert.equal(result.request.valid,true);});
test("denies missing capability without execution",()=>{const result=explainContext({ir,context:{capabilities:[]}});assert.equal(result.status,"rejected");assert.equal(result.reason_code,"CONTEXT_CAPABILITY_DENIED");});
test("never exposes tenant identity",()=>{const result=explainContext({ir,context:{tenantId:"secret",capabilities:["graph:read"]}});assert.equal(JSON.stringify(result).includes("secret"),false);});
