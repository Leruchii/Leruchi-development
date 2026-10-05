import {randomUUID} from "node:crypto";
import {assertTrustedExecutionContext} from "../execution-context/index.mjs";
import {validateContextIR,hashContextIR} from "../context-ir/index.mjs";
import {validateRetrievalIR} from "../retrieval-ir/index.mjs";

const MAX_PARAMETER_BYTES=64*1024;

export class ContextResolutionError extends Error{
  constructor(code,message,details=undefined){super(message);this.name="ContextResolutionError";this.code=code;this.details=details;}
}

function capabilitiesForSource(source){
  if(source.type==="schema"||source.type==="query")return ["graph:read"];
  if(source.type==="retrieval"){
    const required=[];
    if(source.ir?.sources?.graph)required.push("graph:read");
    if(source.ir?.sources?.vector)required.push("vector:read");
    return required;
  }
  return [];
}

export function preflightContext(ir,context,parameterSets=[]){
  try{assertTrustedExecutionContext(context);}catch{throw new ContextResolutionError("UNTRUSTED_CONTEXT","Trusted execution context is required");}
  try{validateContextIR(ir);}catch(error){throw new ContextResolutionError(error.code??"INVALID_CONTEXT_IR",error.message);}
  if(!Array.isArray(parameterSets))throw new ContextResolutionError("INVALID_CONTEXT_PARAMETERS","parameters must be an array indexed by context source");
  if(parameterSets.length>ir.sources.length)throw new ContextResolutionError("INVALID_CONTEXT_PARAMETERS","parameters contains entries for undeclared context sources");
  const serialized=JSON.stringify(parameterSets);
  if(Buffer.byteLength(serialized,"utf8")>MAX_PARAMETER_BYTES)throw new ContextResolutionError("CONTEXT_PARAMETER_LIMIT_EXCEEDED","Context source parameters exceed 64 KiB");
  const granted=new Set(context.capabilities??[]);
  for(let index=0;index<ir.sources.length;index++){
    const source=ir.sources[index];
    if(source.type==="records")throw new ContextResolutionError("CONTEXT_SOURCE_UNSUPPORTED","records context resolution is not supported in v1",{source_index:index});
    if(source.type==="retrieval"){
      try{validateRetrievalIR(source.ir);}catch(error){throw new ContextResolutionError(error.code??"INVALID_RETRIEVAL_IR",error.message,{source_index:index});}
    }
    const denied=capabilitiesForSource(source).filter(capability=>!granted.has(capability));
    if(denied.length)throw new ContextResolutionError("CONTEXT_CAPABILITY_DENIED","Context source capability is not authorized",{source_index:index,required_capabilities:denied});
    const params=parameterSets[index]??{};
    if(!params||typeof params!=="object"||Array.isArray(params))throw new ContextResolutionError("INVALID_CONTEXT_PARAMETERS","Each context parameter entry must be an object",{source_index:index});
  }
}

function resultCount(source,result){
  if(source.type==="schema")return 1;
  if(Number.isInteger(result?.count)&&result.count>=0)return result.count;
  if(Array.isArray(result?.rows))return result.rows.length;
  return 1;
}

export async function resolveContext({
  ir,
  context,
  parameterSets=[],
  requestId=randomUUID(),
  resolveSchema,
  executeQuery,
  executeRetrieval,
  observability
}={}){
  preflightContext(ir,context,parameterSets);
  if(typeof resolveSchema!=="function"||typeof executeQuery!=="function"||typeof executeRetrieval!=="function")throw new ContextResolutionError("CONTEXT_RESOLVER_MISCONFIGURED","Context resolver adapters are required");

  const started=Date.now();
  const outputs=[];
  let count=0;

  for(let index=0;index<ir.sources.length;index++){
    const source=ir.sources[index];
    const remaining=ir.budget.max_items-count;
    if(remaining<=0)break;
    const requested=Math.min(source.limit??remaining,remaining);
    let data;
    if(source.type==="schema")data=await resolveSchema({source,index,limit:requested,requestId});
    else if(source.type==="query")data=await executeQuery({source,index,parameters:parameterSets[index]??{},limit:requested,requestId});
    else if(source.type==="retrieval")data=await executeRetrieval({source,index,parameters:parameterSets[index]??{},limit:requested,requestId});
    else throw new ContextResolutionError("CONTEXT_SOURCE_UNSUPPORTED","Unsupported context source",{source_index:index});

    const sourceCount=resultCount(source,data);
    if(sourceCount>remaining)throw new ContextResolutionError("CONTEXT_ITEM_BUDGET_EXCEEDED","Context source exceeded remaining item budget",{source_index:index,remaining,received:sourceCount});
    outputs.push({source_index:index,type:source.type,count:sourceCount,data});
    count+=sourceCount;

    const bytes=Buffer.byteLength(JSON.stringify(outputs),"utf8");
    if(bytes>ir.budget.max_bytes)throw new ContextResolutionError("CONTEXT_BYTE_BUDGET_EXCEEDED","Resolved context exceeds max_bytes",{max_bytes:ir.budget.max_bytes});
  }

  const bytes=Buffer.byteLength(JSON.stringify(outputs),"utf8");
  const duration=Date.now()-started;
  try{observability?.emitLog?.({event:"context.resolution",request_id:requestId,source_count:outputs.length,item_count:count,outcome:"success"});}catch{}
  try{observability?.observe?.("vibe_context_resolution_duration_ms",duration,{source_count:String(outputs.length)});}catch{}

  return {
    version:"v1",
    request_id:requestId,
    ir_hash:hashContextIR(ir),
    execution:"resolved",
    freshness:{mode:ir.freshness.mode},
    budget:{max_items:ir.budget.max_items,max_bytes:ir.budget.max_bytes,used_items:count,used_bytes:bytes},
    sources:outputs,
    count
  };
}
