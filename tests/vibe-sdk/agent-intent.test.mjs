import assert from "node:assert/strict";
import test from "node:test";
import {createClient} from "../../packages/vibe-sdk/index.mjs";

const query={version:"v1",kind:"graph_query",graph:"g",root:{label:"Person",alias:"root"},steps:[],filters:[],projection:[{field:"root.name",alias:"name"}],orderBy:[],limit:5,offset:0,depth:0,parameters:[]};

test("SDK Agent Intent explanation uses the dedicated non-executing transport",async()=>{let captured;const client=createClient({transport:{request:async(kind,body)=>{captured={kind,body};return {status:"ready"};}}});const result=await client.agent().intent("query",query).bindings({q:"x"}).explain();assert.equal(result.status,"ready");assert.equal(captured.kind,"agent-intent-explain");assert.equal(captured.body.intent.action,"query");assert.equal(captured.body.intent.bindings.q,"x");});
test("SDK Agent Intent requires a supported structured action",()=>{const client=createClient({transport:{request:async()=>({})}});assert.throws(()=>client.agent().intent("natural_language",query),/Unsupported Agent Intent action/);});
