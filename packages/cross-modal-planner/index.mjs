import {createHash} from "node:crypto";
import {assertTrustedExecutionContext} from "../execution-context/index.mjs";
import {validateQuery} from "../query-validation/index.mjs";
import {validateRetrievalIR} from "../retrieval-ir/index.mjs";
import {validateContextIR} from "../context-ir/index.mjs";
import {validateMutation} from "../mutation-validation/index.mjs";

const TYPES=new Set(["query","retrieval","context","mutation"]);
const KINDS={query:"graph_query",retrieval:"retrieval_query",context:"context_request",mutation:"graph_mutation"};
const MAX_STEPS=32;
const MAX_DEPENDENCIES=128;
const MAX_BYTES=128*1024;

export class CrossModalPlanError extends Error{constructor(code,message,details=undefined){super(message);this.name="CrossModalPlanError";this.code=code;this.details=details;}}
function fail(code,message,details){throw new CrossModalPlanError(code,message,details);}
function canonical(value){if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";return JSON.stringify(value);}
function containsOverride(value){if(!value||typeof value!=="object")return false;if(Object.hasOwn(value,"tenant_id")||Object.hasOwn(value,"tenantId")||Object.hasOwn(value,"authorization")||Object.hasOwn(value,"access_token")||Object.hasOwn(value,"token"))return true;return Object.values(value).some(containsOverride);}
function requirements(step){
  if(step.type==="query")return ["graph:read"];
  if(step.type==="retrieval")return [...new Set([...(step.ir.sources?.graph?["graph:read"]:[]),...(step.ir.sources?.vector?["vector:read"]:[])])];
  if(step.type==="context"){const r=[];for(const s of step.ir.sources??[]){if(["schema","query"].includes(s.type))r.push("graph:read");if(s.type==="retrieval"){if(s.ir?.sources?.graph)r.push("graph:read");if(s.ir?.sources?.vector)r.push("vector:read");}}return [...new Set(r)];}
  const r=["graph:write"];if(["delete_vertex","delete_edge"].includes(step.ir.operation))r.push("graph:delete");return r;
}
function validateTarget(step,context,catalog){
  if(step.type==="query"){const v=validateQuery(step.ir,context,catalog);if(!v.ok)fail("PLAN_QUERY_INVALID","Query step is invalid",{step_id:step.id});return;}
  if(step.type==="retrieval"){try{validateRetrievalIR(step.ir);}catch(e){fail("PLAN_RETRIEVAL_INVALID","Retrieval step is invalid",{step_id:step.id,reason:e.code});}if(step.ir.sources?.graph){const v=validateQuery(step.ir.sources.graph.query,context,catalog);if(!v.ok)fail("PLAN_QUERY_INVALID","Retrieval graph query is invalid",{step_id:step.id});}return;}
  if(step.type==="context"){try{validateContextIR(step.ir);}catch(e){fail("PLAN_CONTEXT_INVALID","Context step is invalid",{step_id:step.id,reason:e.code});}for(const source of step.ir.sources){if(source.type==="records")fail("PLAN_CONTEXT_SOURCE_UNSUPPORTED","Records context is unsupported",{step_id:step.id});if(source.type==="query"){const v=validateQuery(source.ir,context,catalog);if(!v.ok)fail("PLAN_QUERY_INVALID","Context query source is invalid",{step_id:step.id});}if(source.type==="retrieval"){try{validateRetrievalIR(source.ir);}catch(e){fail("PLAN_RETRIEVAL_INVALID","Context retrieval source is invalid",{step_id:step.id,reason:e.code});}}}return;}
  try{validateMutation(step.ir,context,catalog);}catch(e){fail("PLAN_MUTATION_INVALID","Mutation step is invalid",{step_id:step.id});}
}
function topo(steps){
  const ids=new Set(steps.map(s=>s.id));const indegree=new Map(steps.map(s=>[s.id,0]));const next=new Map(steps.map(s=>[s.id,[]]));let depCount=0;
  for(const s of steps){for(const d of s.depends_on??[]){depCount++;if(depCount>MAX_DEPENDENCIES)fail("PLAN_DEPENDENCY_LIMIT_EXCEEDED","Plan has too many dependencies");if(!ids.has(d))fail("PLAN_UNKNOWN_DEPENDENCY","Plan dependency references an unknown step",{step_id:s.id,dependency:d});indegree.set(s.id,indegree.get(s.id)+1);next.get(d).push(s.id);}}
  const queue=[...steps.filter(s=>indegree.get(s.id)===0).map(s=>s.id)];const order=[];while(queue.length){const id=queue.shift();order.push(id);for(const n of next.get(id)){const v=indegree.get(n)-1;indegree.set(n,v);if(v===0)queue.push(n);}}if(order.length!==steps.length)fail("PLAN_CYCLE","Plan dependencies must form an acyclic graph");return order;
}
export function validateCrossModalPlan(plan){
  if(!plan||typeof plan!=="object"||Array.isArray(plan))fail("INVALID_CROSS_MODAL_PLAN","Plan must be an object");
  if(plan.version!=="v1"||plan.kind!=="cross_modal_plan")fail("INVALID_CROSS_MODAL_PLAN","Unsupported plan version or kind");
  if(!Array.isArray(plan.steps)||plan.steps.length<1||plan.steps.length>MAX_STEPS)fail("PLAN_STEP_LIMIT_EXCEEDED","Plan must contain 1-32 steps");
  if(plan.budget!==undefined&&(!Number.isInteger(plan.budget.max_items)||plan.budget.max_items<1||plan.budget.max_items>1000||!Number.isInteger(plan.budget.max_bytes)||plan.budget.max_bytes<1024||plan.budget.max_bytes>1024*1024))fail("PLAN_BUDGET_INVALID","Plan budget is invalid");
  const ids=new Set();for(const step of plan.steps){if(!step||typeof step!=="object"||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(step.id||""))fail("PLAN_STEP_INVALID","Step id is invalid");if(ids.has(step.id))fail("PLAN_DUPLICATE_STEP","Step ids must be unique",{step_id:step.id});ids.add(step.id);if(!TYPES.has(step.type))fail("PLAN_STEP_INVALID","Unsupported step type",{step_id:step.id});if(!step.ir||step.ir.kind!==KINDS[step.type])fail("PLAN_STEP_KIND_MISMATCH","Step type does not match canonical IR kind",{step_id:step.id});if(containsOverride(step))fail("PLAN_TRUST_BOUNDARY_VIOLATION","Plan cannot carry tenant identity or credentials",{step_id:step.id});}
  const bytes=Buffer.byteLength(JSON.stringify(plan),"utf8");if(bytes>MAX_BYTES)fail("PLAN_SIZE_LIMIT_EXCEEDED","Plan exceeds 128 KiB");
  topo(plan.steps);return plan;
}
export function explainCrossModalPlan({plan,context,catalog,requestId=context?.requestId??null,observability}={}){
  try{assertTrustedExecutionContext(context);validateCrossModalPlan(plan);const granted=new Set(context.capabilities??[]);const required=[...new Set(plan.steps.flatMap(requirements))];const denied=required.filter(x=>!granted.has(x));const order=topo(plan.steps);for(const step of plan.steps)validateTarget(step,context,catalog);const destructive=plan.steps.some(s=>s.type==="mutation"&&["delete_vertex","delete_edge"].includes(s.ir.operation));const result={version:"v1",status:denied.length?"rejected":"ready",reason_code:denied.length?"PLAN_CAPABILITY_DENIED":"CROSS_MODAL_PLAN_READY",execution:"not_executed",step_order:order,step_count:plan.steps.length,required_capabilities:required,missing_capabilities:denied,destructive,approval_required:destructive,plan_hash:hashCrossModalPlan(plan)};try{observability?.emitLog?.({event:"cross.modal.plan.explain",request_id:requestId,outcome:result.status,reason_code:result.reason_code,step_count:result.step_count,destructive});}catch{}return Object.freeze(result);}catch(e){const result={version:"v1",status:"rejected",reason_code:e.code??"INVALID_CROSS_MODAL_PLAN",execution:"not_executed"};try{observability?.emitLog?.({event:"cross.modal.plan.explain",request_id:requestId,outcome:"rejected",reason_code:result.reason_code});}catch{}return Object.freeze(result);}}
export function canonicalizeCrossModalPlan(plan){validateCrossModalPlan(plan);return canonical(plan);}
export function hashCrossModalPlan(plan){return createHash("sha256").update(canonicalizeCrossModalPlan(plan)).digest("hex");}
