import assert from "node:assert/strict";
import test from "node:test";
import {createClient} from "../../packages/vibe-sdk/index.mjs";

test("SDK context builder produces bounded non-executing request",async()=>{let captured;const client=createClient({transport:{request:async(kind,body)=>{captured={kind,body};return {ok:true};}}});const result=await client.context().purpose("Understand customer graph").source({type:"schema",catalog_ref:"public.customer"}).budget({maxItems:20,maxBytes:8192}).explain();assert.equal(result.ok,true);assert.equal(captured.kind,"context-explain");assert.equal(captured.body.ir.budget.max_items,20);});
test("SDK context rejects tenant override",()=>{const client=createClient({transport:{request:async()=>({})}});assert.throws(()=>client.context().purpose("x").source({type:"records",tenant_id:"other"}),/Tenant identity/);});
