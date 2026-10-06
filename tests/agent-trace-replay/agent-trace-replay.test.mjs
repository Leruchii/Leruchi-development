import test from "node:test";
import assert from "node:assert/strict";
import {createAgentTrace,validateTrace,replayAgentTrace,createTraceDataset,diffReplayResults} from "../../packages/agent-trace-replay/index.mjs";
import {createExecutionContext} from "../../packages/execution-context/index.mjs";

const context=createExecutionContext({tenant_id:"tenant_a",role:"authenticated",capabilities:["graph:read"]},{requestId:"req-trace"});
const plan={version:"v1",kind:"cross_modal_plan",steps:[{id:"read",type:"query",ir:{version:"v1",kind:"graph_query",graph:"app",root:{label:"User",alias:"u"},steps:[],filters:[],projection:[],orderBy:[],limit:10,offset:0,depth:0,parameters:[]}}]};

test("trace sanitizes sensitive fields and hashes the sanitized artifact",()=>{
  const trace=createAgentTrace({traceId:"trace-1",requestId:"req-1",artifactKind:"cross_modal_plan",artifact:{...plan,tenant_id:"tenant_a",bindings:{token:"secret"},query:"private"},expected:{status:"rejected"},metadata:{case_name:"safe"}});
  assert.equal(trace.artifact.tenant_id,undefined);
  assert.equal(trace.artifact.bindings,undefined);
  assert.equal(trace.artifact.query,undefined);
  assert.match(trace.artifact_hash,/^[0-9a-f]{64}$/);
  assert.doesNotThrow(()=>validateTrace(trace));
});

test("replay is deterministic, bounded and never executes",()=>{
  const trace=createAgentTrace({traceId:"trace-2",artifactKind:"cross_modal_plan",artifact:plan,expected:{status:"rejected"}});
  const result=replayAgentTrace({trace,context,catalog:{graphs:{}}});
  assert.equal(result.status,"pass");
  assert.equal(result.execution,"not_executed");
  assert.equal(Object.hasOwn(result,"plan"),false);
});

test("tampered traces and oversized datasets fail closed",()=>{
  const trace=createAgentTrace({traceId:"trace-3",artifactKind:"cross_modal_plan",artifact:plan,expected:{status:"rejected"}});
  assert.throws(()=>validateTrace({...trace,artifact_hash:"0".repeat(64)}),/hash/);
  assert.throws(()=>createTraceDataset(Array.from({length:129},()=>trace)),/1-128/);
});

test("replay diff detects behavioral regression",()=>{
  const result=diffReplayResults([{status:"pass"},{status:"fail"}]);
  assert.deepEqual(result,{version:"v1",kind:"agent_replay_diff",total:2,passed:1,failed:1,regression:true});
});
