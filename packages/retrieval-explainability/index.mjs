import {hashRetrievalIR,validateRetrievalIR} from "../retrieval-ir/index.mjs";
import {planRetrieval,retrievalEngineCapabilities} from "../planner/retrieval.mjs";

const MODES=new Set(["graph","vector","hybrid"]);
const SAFE_REASONS=Object.freeze({
  ready:"RETRIEVAL_READY",
  graph:"PLANNER_SELECTED_GRAPH",
  vector:"PLANNER_SELECTED_VECTOR",
  hybrid:"PLANNER_SELECTED_HYBRID",
  invalid:"RETRIEVAL_IR_INVALID",
  capability:"RETRIEVAL_CAPABILITY_DENIED",
  engine:"RETRIEVAL_ENGINE_UNAVAILABLE",
  limit:"RETRIEVAL_LIMIT_EXCEEDED",
  cost:"RETRIEVAL_COST_EXCEEDED"
});

function safeError(code,message){
  const error=new Error(message);
  error.code=code;
  return error;
}

function capabilityForSource(source,context){
  const capabilities=new Set(context?.capabilities??[]);
  return source==="graph" ? capabilities.has("graph:read") : capabilities.has("vector:read");
}

function boundedSourceSummary(ir){
  return {
    graph:Boolean(ir.sources?.graph),
    vector:Boolean(ir.sources?.vector),
    max_results:ir.limits.max_results,
    max_cost:ir.limits.max_cost,
    fusion:ir.fusion.strategy
  };
}

/**
 * Produces an engine-neutral, non-executing explanation.
 * It deliberately exposes mode and deterministic reason codes, never physical
 * engine names, SQL/Cypher, tenant identifiers, embeddings, parameters or catalog internals.
 */
export function explainRetrieval({
  ir,
  context,
  retrievalCapabilities=retrievalEngineCapabilities({
    apacheAge:{available:true,features:["graph_query"]},
    postgresqlRecursive:{available:false,features:[]},
    postgresqlVector:{available:true,features:["vector"]}
  }),
  preferredGraphEngines,
  preferredVectorEngines
}={}){
  try{validateRetrievalIR(ir);}catch(error){
    return Object.freeze({
      version:"v1",
      status:"rejected",
      reason_code:SAFE_REASONS.invalid,
      source:undefined,
      request:{valid:false},
      safe_summary:undefined,
      ir_hash:undefined
    });
  }
  const sources=["graph","vector"].filter(source=>ir.sources?.[source]);
  const denied=sources.filter(source=>!capabilityForSource(source,context));
  if(denied.length){
    return Object.freeze({
      version:"v1",status:"rejected",reason_code:SAFE_REASONS.capability,
      denied_sources:denied,
      request:{valid:true},
      safe_summary:boundedSourceSummary(ir),
      ir_hash:hashRetrievalIR(ir)
    });
  }
  let plan;
  try{
    plan=planRetrieval(ir,{capabilities:retrievalCapabilities,preferredGraph:preferredGraphEngines,preferredVector:preferredVectorEngines});
  }catch(error){
    const reason=error.code==="RETRIEVAL_LIMIT_EXCEEDED"?SAFE_REASONS.limit:
      error.code==="RETRIEVAL_COST_EXCEEDED"?SAFE_REASONS.cost:SAFE_REASONS.engine;
    return Object.freeze({
      version:"v1",status:"rejected",reason_code:reason,
      request:{valid:true},safe_summary:boundedSourceSummary(ir),ir_hash:hashRetrievalIR(ir)
    });
  }
  const mode=plan.mode;
  if(!MODES.has(mode)) throw safeError("INVALID_EXPLAIN_MODE","Unexpected retrieval mode");
  return Object.freeze({
    version:"v1",status:"ready",
    reason_code:SAFE_REASONS[mode],
    mode,
    request:{valid:true},
    safe_summary:boundedSourceSummary(ir),
    ir_hash:hashRetrievalIR(ir),
    execution:"not_executed"
  });
}

export function evaluateRetrievalExplanation(explanation,expected={}){
  const checks=[];
  const add=(name,pass,reason_code)=>checks.push({name,pass,reason_code});
  add("version",explanation?.version==="v1","EVALUATION_VERSION_MISMATCH");
  add("status",explanation?.status==="ready","EVALUATION_NOT_READY");
  if(expected.mode!==undefined)add("mode",explanation?.mode===expected.mode,"EVALUATION_MODE_MISMATCH");
  if(expected.reason_code!==undefined)add("reason_code",explanation?.reason_code===expected.reason_code,"EVALUATION_REASON_MISMATCH");
  if(expected.sources!==undefined){
    const actual=explanation?.safe_summary;
    const wanted=expected.sources;
    add("sources",Boolean(actual)&&actual.graph===Boolean(wanted.graph)&&actual.vector===Boolean(wanted.vector),"EVALUATION_SOURCE_MISMATCH");
  }
  return Object.freeze({
    version:"v1",
    pass:checks.every(check=>check.pass),
    checks
  });
}
