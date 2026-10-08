import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {run} from "../../packages/leruchi-cli/index.mjs";
test("CLI cross-modal plan explain uses authenticated plan endpoint",async()=>{const cwd=fs.mkdtempSync(path.join(os.tmpdir(),"vibe-plan-"));fs.mkdirSync(path.join(cwd,".leruchi"));fs.writeFileSync(path.join(cwd,".leruchi/config.json"),JSON.stringify({baseUrl:"https://api.example"}));const plan={version:"v1",kind:"cross_modal_plan",steps:[{id:"q",type:"query",ir:{version:"v1",kind:"graph_query",graph:"g",root:{label:"Person",alias:"root"},steps:[],filters:[],projection:[{field:"root.id"}],orderBy:[],limit:1,offset:0,depth:0,parameters:[]}}]};fs.writeFileSync(path.join(cwd,"plan.json"),JSON.stringify(plan));const calls=[];const code=await run(["agent","plan","explain","--plan","plan.json"],{cwd,fetchImpl:async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return new Response(JSON.stringify({status:"ready"}),{status:200,headers:{"content-type":"application/json"}})},stdout:()=>{},stderr:()=>{}});assert.equal(code,0);assert.equal(calls[0].url,"https://api.example/v1/agent/plan/explain");assert.equal(calls[0].body.plan.kind,"cross_modal_plan");});
