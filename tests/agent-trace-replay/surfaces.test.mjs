import test from "node:test";
import assert from "node:assert/strict";
import {createClient} from "../../packages/vibe-sdk/index.mjs";

function client(calls){return createClient({transport:{async request(kind,body){calls.push({kind,body});return {version:"v1",status:"pass"};}}});}

test("SDK trace and replay surfaces converge on transport kinds",async()=>{
  const calls=[];
  const api=client(calls);
  const input={artifact_kind:"cross_modal_plan",artifact:{version:"v1",kind:"cross_modal_plan",steps:[]},expected:{status:"rejected"}};
  await api.agent().trace(input).create();
  await api.agent().replay({version:"v1",kind:"agent_trace",trace_id:"t",artifact_kind:"cross_modal_plan",artifact:input.artifact,artifact_hash:"0".repeat(64),expected:{status:"rejected"},outcome:null,metadata:{}});
  assert.equal(calls[0].kind,"agent-trace");
  assert.equal(calls[1].kind,"agent-replay");
  assert.equal(calls[0].body.artifact_kind,"cross_modal_plan");
});
