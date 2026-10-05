import {createHash} from "node:crypto";
import {assertTrustedExecutionContext} from "../execution-context/index.mjs";
import {validateQuery} from "../query-validation/index.mjs";
import {validateRetrievalIR} from "../retrieval-ir/index.mjs";
import {validateContextIR} from "../context-ir/index.mjs";
import {validateMutation} from "../mutation-validation/index.mjs";

const ACTIONS=new Set(["query","retrieval","context","mutation"]);
const KINDS=Object.freeze({query:"graph_query",retrieval:"retrieval_query",context:"context_request",mutation:"graph_mutation"});
const MAX_BINDING_BYTES=64*1024;
const ALLOWED_KEYS=new Set(["version","kind","action","ir","bindings"]);

export class AgentIntentError extends Error{
  constructor(code,message,details=undefined){super(message);this.name="AgentIntentError";this.code=code;this.details=details;}
}

function canonical(value){
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
  return JSON.stringify(value);
}
function directTenantOverride(value){return Boolean(value&&typeof value==="object"&&(Object.hasOwn(value,"tenant_id")||Object.hasOwn(value,"tenantId")));}
function credentialOverride(value){return Boolean(value&&typeof value==="object"&&(Object.hasOwn(value,"authorization")||Object.hasOwn(value,"access_token")||Object.hasOwn(value,"token")));}
function fail(code,message,details){throw new AgentIntentError(code,message,details);}

export function validateAgentIntent(intent){
  if(!intent||typeof intent!=="object"||Array.isArray(intent))fail("INVALID_AGENT_INTENT","Agent Intent must be an object");
  if(directTenantOverride(intent))fail("AGENT_INTENT_TENANT_OVERRIDE","Tenant identity cannot be supplied by Agent Intent");
  if(credentialOverride(intent))fail("AGENT_INTENT_CREDENTIAL_OVERRIDE","Credentials cannot be supplied by Agent Intent");
  for(const key of Object.keys(intent))if(!ALLOWED_KEYS.has(key))fail("INVALID_AGENT_INTENT","Agent Intent contains an undeclared field",{field:key});
  if(intent.version!=="v1"||intent.kind!=="agent_intent")fail("INVALID_AGENT_INTENT","Unsupported Agent Intent version or kind");
  if(!ACTIONS.has(intent.action))fail("INVALID_AGENT_INTENT","Unsupported Agent Intent action");
  if(!intent.ir||typeof intent.ir!=="object"||Array.isArray(intent.ir))fail("INVALID_AGENT_INTENT","Agent Intent requires a canonical target IR");
  if(intent.ir.kind!==KINDS[intent.action])fail("AGENT_INTENT_KIND_MISMATCH","Agent Intent action does not match target IR kind");
  if(directTenantOverride(intent.ir))fail("AGENT_INTENT_TENANT_OVERRIDE","Tenant identity cannot be supplied by Agent Intent");
  if(credentialOverride(intent.ir))fail("AGENT_INTENT_CREDENTIAL_OVERRIDE","Credentials cannot be supplied by Agent Intent");
  if(intent.action==="context"){
    for(const source of intent.ir.sources??[]){
      if(directTenantOverride(source?.ir))fail("AGENT_INTENT_TENANT_OVERRIDE","Tenant identity cannot be supplied inside Context target IR");
      if(credentialOverride(source?.ir))fail("AGENT_INTENT_CREDENTIAL_OVERRIDE","Credentials cannot be supplied inside Context target IR");
    }
  }

  const bindings=intent.bindings??(intent.action==="context"?[]:{});
  if(intent.action==="context"){
    if(!Array.isArray(bindings)||bindings.length>32||bindings.some(value=>!value||typeof value!=="object"||Array.isArray(value)))fail("INVALID_AGENT_INTENT_BINDINGS","Context bindings must be an array of objects");
  }else if(!bindings||typeof bindings!=="object"||Array.isArray(bindings))fail("INVALID_AGENT_INTENT_BINDINGS","Bindings must be an object");

  if(Buffer.byteLength(JSON.stringify(bindings),"utf8")>MAX_BINDING_BYTES)fail("AGENT_INTENT_BINDING_LIMIT_EXCEEDED","Agent Intent bindings exceed 64 KiB");
  return intent;
}

function requirements(intent){
  if(intent.action==="query")return ["graph:read"];
  if(intent.action==="retrieval"){
    return [...new Set([
      ...(intent.ir.sources?.graph?["graph:read"]:[]),
      ...(intent.ir.sources?.vector?["vector:read"]:[])
    ])];
  }
  if(intent.action==="context"){
    const required=[];
    for(const source of intent.ir.sources??[]){
      if(source.type==="schema"||source.type==="query"||source.type==="records")required.push("graph:read");
      if(source.type==="retrieval"){
        if(source.ir?.sources?.graph)required.push("graph:read");
        if(source.ir?.sources?.vector)required.push("vector:read");
      }
    }
    return [...new Set(required)];
  }
  const required=["graph:write"];
  if(["delete_vertex","delete_edge"].includes(intent.ir.operation))required.push("graph:delete");
  return required;
}

export function preflightAgentIntent({intent,context}={}){
  try{assertTrustedExecutionContext(context);}catch{fail("UNTRUSTED_CONTEXT","Trusted execution context is required");}
  validateAgentIntent(intent);
  if(intent.action==="context"&&(intent.ir.sources??[]).some(source=>source.type==="records"))fail("CONTEXT_SOURCE_UNSUPPORTED","records context intent is not supported in v1");
  const requiredCapabilities=requirements(intent);
  const granted=new Set(context.capabilities??[]);
  const denied=requiredCapabilities.filter(capability=>!granted.has(capability));
  if(denied.length)fail("AGENT_INTENT_CAPABILITY_DENIED","Agent Intent requires capabilities that are not authorized",{required_capabilities:denied});
  const destructive=intent.action==="mutation"&&["delete_vertex","delete_edge"].includes(intent.ir.operation);
  return Object.freeze({
    action:intent.action,
    required_capabilities:Object.freeze(requiredCapabilities),
    read_only:intent.action!=="mutation",
    destructive,
    idempotent:intent.action!=="mutation",
    approval_required:destructive
  });
}

function validateContextTargets(ir,context,catalog){
  try{validateContextIR(ir);}catch(error){return {ok:false,reason:error.code??"INVALID_CONTEXT_IR"};}
  for(const source of ir.sources){
    if(source.type==="records")return {ok:false,reason:"CONTEXT_SOURCE_UNSUPPORTED"};
    if(source.type==="query"){
      const validation=validateQuery(source.ir,context,catalog);
      if(!validation.ok)return {ok:false,reason:"QUERY_IR_INVALID"};
    }
    if(source.type==="retrieval"){
      try{validateRetrievalIR(source.ir);}catch{return {ok:false,reason:"RETRIEVAL_IR_INVALID"};}
      if(source.ir.sources?.graph){
        const validation=validateQuery(source.ir.sources.graph.query,context,catalog);
        if(!validation.ok)return {ok:false,reason:"QUERY_IR_INVALID"};
      }
    }
  }
  return {ok:true};
}

function validateTarget(intent,context,catalog){
  if(intent.action==="query"){
    const validation=validateQuery(intent.ir,context,catalog);
    return validation.ok?{ok:true}:{ok:false,reason:"QUERY_IR_INVALID"};
  }
  if(intent.action==="retrieval"){
    try{validateRetrievalIR(intent.ir);}catch{return {ok:false,reason:"RETRIEVAL_IR_INVALID"};}
    if(intent.ir.sources?.graph){
      const validation=validateQuery(intent.ir.sources.graph.query,context,catalog);
      if(!validation.ok)return {ok:false,reason:"QUERY_IR_INVALID"};
    }
    return {ok:true};
  }
  if(intent.action==="context")return validateContextTargets(intent.ir,context,catalog);
  const validation=validateMutation(intent.ir,context,catalog);
  return validation.ok?{ok:true}:{ok:false,reason:"MUTATION_IR_INVALID"};
}

export function explainAgentIntent({intent,context,catalog,observability,requestId=context?.requestId??null}={}){
  const finalize=result=>{
    try{observability?.emitLog?.({event:"agent.intent.explain",request_id:requestId,action:result.action??intent?.action??null,outcome:result.status,reason_code:result.reason_code,destructive:Boolean(result.destructive)});}catch{}
    return Object.freeze(result);
  };
  let policy;
  try{policy=preflightAgentIntent({intent,context});}
  catch(error){
    return finalize({
      version:"v1",
      status:"rejected",
      reason_code:error.code??"INVALID_AGENT_INTENT",
      execution:"not_executed"
    });
  }
  const target=validateTarget(intent,context,catalog);
  if(!target.ok){
    return finalize({
      version:"v1",
      status:"rejected",
      reason_code:target.reason,
      action:intent.action,
      required_capabilities:policy.required_capabilities,
      read_only:policy.read_only,
      destructive:policy.destructive,
      approval_required:policy.approval_required,
      execution:"not_executed",
      intent_hash:hashAgentIntent(intent)
    });
  }
  return finalize({
    version:"v1",
    status:"ready",
    reason_code:"AGENT_INTENT_READY",
    action:intent.action,
    target_ir_kind:intent.ir.kind,
    required_capabilities:policy.required_capabilities,
    read_only:policy.read_only,
    destructive:policy.destructive,
    idempotent:policy.idempotent,
    approval_required:policy.approval_required,
    execution:"not_executed",
    intent_hash:hashAgentIntent(intent)
  });
}

export function canonicalizeAgentIntent(intent){
  validateAgentIntent(intent);
  const normalized={...intent,bindings:intent.bindings??(intent.action==="context"?[]:{})};
  return canonical(normalized);
}
export function hashAgentIntent(intent){return createHash("sha256").update(canonicalizeAgentIntent(intent)).digest("hex");}
