import {createHash} from "node:crypto";
import {explainAgentIntent,hashAgentIntent} from "../agent-intent/index.mjs";
import {explainCrossModalPlan,hashCrossModalPlan} from "../cross-modal-planner/index.mjs";

const MAX_TRACE_BYTES=128*1024;
const MAX_DATASET_BYTES=512*1024;
const MAX_CASES=128;
const NAME=/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const EXPECTED=new Set(["status","reason_code","destructive","approval_required"]);
const FORBIDDEN=/(authorization|cookie|token|secret|password|api[_-]?key|private[_-]?key|credential|tenant[_-]?id|tenantId|embedding|sql|cypher|query|parameters?|bindings?)/i;

export class AgentTraceError extends Error{constructor(code,message,details=undefined){super(message);this.name="AgentTraceError";this.code=code;this.details=details;}}
function fail(code,message,details){throw new AgentTraceError(code,message,details);}
function canonical(v){if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";if(v&&typeof v==="object")return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";return JSON.stringify(v);}
export function hashArtifact(v){return createHash("sha256").update(canonical(v)).digest("hex");}
function clean(value,depth=0){
  if(depth>8)fail("TRACE_TOO_DEEP","Trace artifact nesting exceeds the bounded depth");
  if(value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean")return value;
  if(Array.isArray(value))return value.slice(0,64).map(v=>clean(v,depth+1));
  if(typeof value!=="object")return null;
  const out={};
  for(const [key,val] of Object.entries(value)){
    if(FORBIDDEN.test(key))continue;
    out[key]=clean(val,depth+1);
  }
  return out;
}
function safeExpected(expected){
  if(!expected||typeof expected!=="object"||Array.isArray(expected))fail("TRACE_EXPECTATION_INVALID","Expected outcome must be an object");
  for(const key of Object.keys(expected))if(!EXPECTED.has(key))fail("TRACE_EXPECTATION_INVALID","Unsupported expected outcome field",{field:key});
  if(expected.status!==undefined&&!["ready","rejected"].includes(expected.status))fail("TRACE_EXPECTATION_INVALID","Expected status must be ready or rejected");
  for(const key of ["reason_code","destructive","approval_required"]){
    if(expected[key]!==undefined&&typeof expected[key]!=="string"&&typeof expected[key]!=="boolean")fail("TRACE_EXPECTATION_INVALID","Invalid expected outcome field",{field:key});
  }
  return Object.freeze({...expected});
}
function safeArtifact(kind,artifact){
  if(!["agent_intent","cross_modal_plan"].includes(kind))fail("TRACE_ARTIFACT_KIND_INVALID","Unsupported trace artifact kind");
  if(!artifact||typeof artifact!=="object"||Array.isArray(artifact))fail("TRACE_ARTIFACT_INVALID","Trace artifact must be an object");
  const sanitized=clean(artifact);
  if(Buffer.byteLength(JSON.stringify(sanitized),"utf8")>MAX_TRACE_BYTES)fail("TRACE_ARTIFACT_TOO_LARGE","Sanitized trace artifact exceeds 128 KiB");
  return sanitized;
}
export function createAgentTrace({traceId,requestId,artifactKind,artifact,expected,outcome,metadata={}}={}){
  if(typeof traceId!=="string"||!traceId)fail("TRACE_ID_REQUIRED","traceId is required");
  if(requestId!==undefined&&requestId!==null&&(typeof requestId!=="string"||requestId.length>128))fail("TRACE_REQUEST_ID_INVALID","requestId is invalid");
  const sanitized=safeArtifact(artifactKind,artifact);
  const trace={
    version:"v1",kind:"agent_trace",trace_id:traceId,request_id:requestId??null,
    artifact_kind:artifactKind,artifact_hash:hashArtifact(sanitized),artifact:sanitized,
    expected:safeExpected(expected??{}),
    outcome:outcome&&typeof outcome==="object"?{
      status:typeof outcome.status==="string"?outcome.status:null,
      reason_code:typeof outcome.reason_code==="string"?outcome.reason_code:null,
      destructive:typeof outcome.destructive==="boolean"?outcome.destructive:null,
      approval_required:typeof outcome.approval_required==="boolean"?outcome.approval_required:null
    }:null,
    metadata:clean(metadata)
  };
  return Object.freeze(trace);
}
export function validateTrace(trace){
  if(!trace||typeof trace!=="object"||Array.isArray(trace))fail("TRACE_INVALID","Trace must be an object");
  if(trace.version!=="v1"||trace.kind!=="agent_trace")fail("TRACE_VERSION_INVALID","Unsupported trace version");
  if(typeof trace.trace_id!=="string"||!trace.trace_id)fail("TRACE_ID_REQUIRED","trace_id is required");
  safeArtifact(trace.artifact_kind,trace.artifact);
  if(hashArtifact(trace.artifact)!==trace.artifact_hash)fail("TRACE_HASH_MISMATCH","Trace artifact hash does not match artifact");
  safeExpected(trace.expected??{});
  const size=Buffer.byteLength(JSON.stringify(trace),"utf8");
  if(size>MAX_TRACE_BYTES)fail("TRACE_TOO_LARGE","Trace exceeds 128 KiB");
  return trace;
}
function actualFor(trace,{context,catalog}={}){
  return trace.artifact_kind==="agent_intent"
    ? explainAgentIntent({intent:trace.artifact,context,catalog})
    : explainCrossModalPlan({plan:trace.artifact,context,catalog});
}
export function replayAgentTrace({trace,context,catalog}={}){
  validateTrace(trace);
  const actual=actualFor(trace,{context,catalog});
  const mismatches=[];
  for(const key of Object.keys(trace.expected??{}))if(actual[key]!==trace.expected[key])mismatches.push(key);
  return Object.freeze({
    version:"v1",kind:"agent_replay",trace_id:trace.trace_id,artifact_kind:trace.artifact_kind,
    artifact_hash:trace.artifact_hash,status:mismatches.length?"fail":"pass",
    expected:trace.expected,actual:{
      status:actual.status??null,reason_code:actual.reason_code??null,
      destructive:actual.destructive??null,approval_required:actual.approval_required??null
    },mismatches,execution:"not_executed"
  });
}
export function createTraceDataset(cases=[]){
  if(!Array.isArray(cases)||cases.length<1||cases.length>MAX_CASES)fail("TRACE_DATASET_CASE_LIMIT","Trace dataset requires 1-128 traces");
  const traces=cases.map(validateTrace);
  const names=new Set();
  for(const trace of traces){
    const name=trace.metadata?.case_name;
    if(name!==undefined&&(!NAME.test(name)||names.has(name)))fail("TRACE_DATASET_CASE_NAME_INVALID","Dataset case names must be unique and bounded");
    if(name)names.add(name);
  }
  const dataset={version:"v1",kind:"agent_trace_dataset",traces};
  if(Buffer.byteLength(JSON.stringify(dataset),"utf8")>MAX_DATASET_BYTES)fail("TRACE_DATASET_TOO_LARGE","Trace dataset exceeds 512 KiB");
  return Object.freeze(dataset);
}
export function diffReplayResults(results){
  if(!Array.isArray(results)||results.length<1)fail("REPLAY_RESULTS_REQUIRED","Replay results are required");
  const failed=results.filter(r=>r.status!=="pass");
  return Object.freeze({version:"v1",kind:"agent_replay_diff",total:results.length,passed:results.length-failed.length,failed:failed.length,regression:failed.length>0});
}
export {safeArtifact};
