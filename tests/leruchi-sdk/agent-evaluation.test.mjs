import test from "node:test";
import assert from "node:assert/strict";
import {createClient} from "../../packages/leruchi-sdk/index.mjs";

test("SDK agent evaluation converges on the canonical evaluation transport",async()=>{
  const calls=[];
  const client=createClient({transport:{request:async(kind,body)=>{calls.push({kind,body});return {version:"v1",status:"pass"};}}});
  const cases=[{name:"case",plan:{version:"v1",kind:"cross_modal_plan",steps:[{id:"x",type:"query",ir:{version:"v1",kind:"graph_query"}}]},expected:{status:"rejected"}}];
  const built=client.agent().evaluate(cases).build();
  assert.deepEqual(built,{cases});
  const result=await client.agent().evaluate(cases).run();
  assert.equal(result.status,"pass");
  assert.equal(calls[0].kind,"agent-evaluate");
  assert.deepEqual(calls[0].body,{cases});
});
