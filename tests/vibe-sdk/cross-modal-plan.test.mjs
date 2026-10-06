import assert from "node:assert/strict";
import test from "node:test";
import {createClient} from "../../packages/vibe-sdk/index.mjs";
test("SDK builds a cross-modal plan without execution",async()=>{let captured;const client=createClient({transport:{request:async(kind,body)=>{captured={kind,body};return {status:"ready"};}}});const query={version:"v1",kind:"graph_query",graph:"g",root:{label:"Person",alias:"root"},steps:[],filters:[],projection:[{field:"root.name"}],orderBy:[],limit:5,offset:0,depth:0,parameters:[]};const result=await client.agent().plan().step("q","query",query).explain();assert.equal(result.status,"ready");assert.equal(captured.kind,"cross-modal-plan-explain");assert.equal(captured.body.plan.steps[0].type,"query");});
