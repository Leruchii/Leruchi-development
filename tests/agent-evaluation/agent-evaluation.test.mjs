import test from "node:test";
import assert from "node:assert/strict";
import {evaluateAgentCases,validateEvaluationRequest} from "../../packages/agent-evaluation/index.mjs";
import {createExecutionContext} from "../../packages/execution-context/index.mjs";
import {createObservability} from "../../packages/observability/index.mjs";

const context=createExecutionContext({tenant_id:"tenant_a",role:"authenticated",capabilities:["graph:read"]},{requestId:"req-1"});

function invalidPlan(){
  return {version:"v1",kind:"cross_modal_plan",steps:[{
    id:"read",type:"query",ir:{version:"v1",kind:"graph_query",graph:"app",root:{label:"User",alias:"u"},steps:[],filters:[],projection:[],orderBy:[],limit:100,offset:0,depth:0,parameters:[]
  }]};
}

test("evaluation validates bounded case count and unique names",()=>{
  assert.throws(()=>validateEvaluationRequest({cases:[]}),/1-64/);
  assert.throws(()=>validateEvaluationRequest({cases:[{name:"x",plan:invalidPlan(),expected:{status:"rejected"}},{name:"x",plan:invalidPlan(),expected:{status:"rejected"}}]}),/unique/);
});

test("evaluation is non-executing and returns only bounded metadata",()=>{
  const metrics=[];
  const logs=[];
  const obs=createObservability({metricSink:e=>metrics.push(e),logSink:e=>logs.push(e)});
  const result=evaluateAgentCases({
    request:{cases:[{name:"invalid-query-target",plan:invalidPlan(),expected:{status:"rejected"}}]},
    context,
    catalog:{graphs:{}},
    observability:obs
  });
  assert.equal(result.status,"pass");
  assert.equal(result.summary.passed,1);
  assert.equal(result.results[0].artifact_kind,"cross_modal_plan");
  assert.match(result.results[0].artifact_hash,/^[0-9a-f]{64}$/);
  assert.equal(Object.hasOwn(result.results[0],"ir"),false);
  assert.equal(Object.hasOwn(logs[0],"target_ir"),false);
  assert.ok(metrics.some(e=>e.name==="vibe_agent_evaluations_total"));
  assert.ok(metrics.some(e=>e.name==="vibe_agent_evaluation_duration_ms"));
});

test("evaluation expectation mismatches are explicit without exposing target payload",()=>{
  const result=evaluateAgentCases({
    request:{cases:[{name:"wrong-expectation",plan:invalidPlan(),expected:{status:"ready"}}]},
    context,
    catalog:{graphs:{}}
  });
  assert.equal(result.status,"fail");
  assert.deepEqual(result.results[0].mismatches,["status"]);
  assert.equal(Object.hasOwn(result.results[0],"plan"),false);
});
