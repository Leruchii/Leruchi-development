import {createHash} from "node:crypto";
import {validateAgentIntent,explainAgentIntent,hashAgentIntent} from "../agent-intent/index.mjs";
import {explainCrossModalPlan,hashCrossModalPlan} from "../cross-modal-planner/index.mjs";

const MAX_CASES=64;
const MAX_BYTES=128*1024;
const NAME=/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const STATUS=new Set(["ready","rejected"]);
const EXPECTED_KEYS=new Set(["status","reason_code","destructive","approval_required"]);

export class AgentEvaluationError extends Error{
  constructor(code,message,details=undefined){super(message);this.name="AgentEvaluationError";this.code=code;this.details=details;}
}
function fail(code,message,details){throw new AgentEvaluationError(code,message,details);}
function canonical(v){if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";return JSON.stringify(v);}
function artifactHash(artifact){return createHash("sha256").update(canonical(artifact)).digest("hex");}
function sanitizeExpected(expected){
  if(!expected||typeof expected!=="object"||Array.isArray(expected))fail("EVALUATION_EXPECTATION_INVALID","Expected result must be an object");
  for(const k of Object.keys(expected))if(!EXPECTED_KEYS.has(k))fail("EVALUATION_EXPECTATION_INVALID","Unsupported expected field",{field:k});
  if(!STATUS.has(expected.status))fail("EVALUATION_EXPECTATION_INVALID","Expected status must be ready or rejected");
  if(expected.reason_code!==undefined&&typeof expected.reason_code!=="string")fail("EVALUATION_EXPECTATION_INVALID","Expected reason_code must be a string");
  for(const k of ["destructive","approval_required"])if(expected[k]!==undefined&&typeof expected[k]!=="boolean")fail("EVALUATION_EXPECTATION_INVALID",`${k} must be boolean`);
  return expected;
}
function validateCase(item,index){
  if(!item||typeof item!=="object"||Array.isArray(item))fail("EVALUATION_CASE_INVALID","Evaluation case must be an object",{index});
  if(typeof item.name!=="string"||!NAME.test(item.name))fail("EVALUATION_CASE_INVALID","Evaluation case name is invalid",{index});
  const hasIntent=item.intent!==undefined,hasPlan=item.plan!==undefined;
  if(hasIntent===hasPlan)fail("EVALUATION_CASE_INVALID","Case must contain exactly one of intent or plan",{index});
  if(!item.expected)fail("EVALUATION_EXPECTATION_INVALID","Case expected result is required",{index});
  sanitizeExpected(item.expected);
  if(Buffer.byteLength(JSON.stringify(item),"utf8")>MAX_BYTES)fail("EVALUATION_CASE_TOO_LARGE","Evaluation case exceeds 128 KiB",{index});
  if(hasIntent)validateAgentIntent(item.intent);
  return item;
}
function compare(actual,expected){
  const mismatches=[];
  for(const k of Object.keys(expected))if(actual[k]!==expected[k])mismatches.push(k);
  return mismatches;
}
export function validateEvaluationRequest(request){
  if(!request||typeof request!=="object"||Array.isArray(request))fail("INVALID_EVALUATION_REQUEST","Evaluation request must be an object");
  if(!Array.isArray(request.cases)||request.cases.length<1||request.cases.length>MAX_CASES)fail("EVALUATION_CASE_LIMIT","Evaluation requires 1-64 cases");
  if(Buffer.byteLength(JSON.stringify(request),"utf8")>MAX_BYTES)fail("EVALUATION_REQUEST_TOO_LARGE","Evaluation request exceeds 128 KiB");
  const names=new Set();
  for(let i=0;i<request.cases.length;i++){const item=validateCase(request.cases[i],i);if(names.has(item.name))fail("EVALUATION_DUPLICATE_CASE","Evaluation case names must be unique",{name:item.name});names.add(item.name);}
  return request;
}
export function evaluateAgentCases({request,context,catalog,observability,requestId=context?.requestId??null}={}){
  validateEvaluationRequest(request);
  const started=Date.now();
  const results=request.cases.map(item=>{
    let actual;
    try{
      actual=item.intent
        ? explainAgentIntent({intent:item.intent,context,catalog})
        : explainCrossModalPlan({plan:item.plan,context,catalog});
    }catch(error){
      actual={version:"v1",status:"rejected",reason_code:error.code??"EVALUATION_ERROR",execution:"not_executed"};
    }
    const mismatches=compare(actual,item.expected);
    const pass=mismatches.length===0;
    const hash=item.intent?hashAgentIntent(item.intent):hashCrossModalPlan(item.plan);
    try{observability?.emitLog?.({event:"agent.evaluation.case",request_id:requestId,case_name:item.name,outcome:pass?"pass":"fail",reason_code:actual.reason_code,artifact_hash:hash});}catch{}
    return Object.freeze({
      name:item.name,pass,status:actual.status,reason_code:actual.reason_code,
      mismatches,artifact_kind:item.intent?"agent_intent":"cross_modal_plan",
      artifact_hash:hash
    });
  });
  const passed=results.filter(x=>x.pass).length;
  const failed=results.length-passed;
  const durationMs=Math.max(0,Date.now()-started);
  const summary={total:results.length,passed,failed,score:passed/results.length};
  try{
    observability?.increment?.("vibe_agent_evaluations_total",1,{outcome:failed?"fail":"pass"});
    observability?.observe?.("vibe_agent_evaluation_duration_ms",durationMs,{outcome:failed?"fail":"pass"});
  }catch{}
  return Object.freeze({version:"v1",status:failed?"fail":"pass",summary,results,duration_ms:durationMs});
}
export {artifactHash};
