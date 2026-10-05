import {randomUUID} from "node:crypto";
import {assertTrustedExecutionContext} from "../execution-context/index.mjs";
import {validateRetrievalIR} from "../retrieval-ir/index.mjs";
import {validateQuery} from "../query-validation/index.mjs";
import {compileAge} from "../compiler-age/index.mjs";
import {compilePostgresqlRecursive} from "../compiler-postgresql-recursive/index.mjs";
import {executeGraphQuery} from "../execution-engine/index.mjs";
import {executeVectorRetrieval} from "../vector-execution/index.mjs";
import {normalizeRetrievalRows} from "../retrieval-contract/index.mjs";
import {fuseWeightedRRF} from "../retrieval-fusion/index.mjs";
import {planRetrieval, retrievalEngineCapabilities} from "../planner/retrieval.mjs";

export class RetrievalExecutionError extends Error {
  constructor(code,message,details=undefined){super(message);this.name="RetrievalExecutionError";this.code=code;this.details=details;}
}

function graphParameters(ir,requestParameters){
  const declared=new Set((ir.parameters??[]).map(parameter=>parameter.name));
  return Object.fromEntries(Object.entries(requestParameters).filter(([name])=>declared.has(name)));
}

export async function executeRetrieval({
  ir,
  context,
  catalog,
  requestParameters={},
  db,
  requestId=randomUUID(),
  validate=validateQuery,
  compile=compileAge,
  recursiveCompile=compilePostgresqlRecursive,
  executeGraph=executeGraphQuery,
  executeVector=executeVectorRetrieval,
  observability,
  retrievalCapabilities = retrievalEngineCapabilities({
    apacheAge: {available: true, features: ["graph_query"]},
    postgresqlRecursive: {available: false, features: []},
    postgresqlVector: {available: true, features: ["vector"]}
  }),
  preferredGraphEngines,
  preferredVectorEngines
}){
  try{assertTrustedExecutionContext(context);}catch{throw new RetrievalExecutionError("UNTRUSTED_CONTEXT","Trusted execution context is required");}
  try{validateRetrievalIR(ir);}catch(error){throw new RetrievalExecutionError(error.code??"INVALID_RETRIEVAL_IR",error.message);}

  const started=Date.now();
  const graph=ir.sources.graph;
  const vector=ir.sources.vector;
  if(vector&&!Object.hasOwn(requestParameters,vector.query_parameter)) throw new RetrievalExecutionError("MISSING_VECTOR_PARAMETER","Vector query parameter is missing",{parameter:vector.query_parameter});
  let graphResult={columns:[],rows:[],count:0};
  let vectorResult={columns:[],rows:[],count:0};
  let graphCost=0;
  let vectorCost=vector?.top_k??0;

  if(graph){
    const graphValidation=validate(graph.query,context,catalog);
    if(!graphValidation.ok) throw new RetrievalExecutionError("GRAPH_RETRIEVAL_VALIDATION_FAILED","Graph retrieval validation failed",graphValidation.errors);
    graphCost=graphValidation.cost??0;
    if(graphCost+vectorCost>ir.limits.max_cost) throw new RetrievalExecutionError("RETRIEVAL_COST_EXCEEDED","Combined retrieval exceeds the request budget",{graph_cost:graphCost,vector_cost:vectorCost,max_cost:ir.limits.max_cost});
    const candidateLimit=graph.candidate_limit??graph.query.limit;
    if(candidateLimit>ir.limits.max_results) throw new RetrievalExecutionError("RETRIEVAL_LIMIT_EXCEEDED","Graph candidate limit exceeds retrieval max_results");
    const boundedQuery={...graph.query,limit:candidateLimit};
    const graphParams=graphParameters(graph.query,requestParameters);
    const plannedCompile = plan.graph.engine === "postgresql-recursive" ? recursiveCompile : compile;
    graphResult=await executeGraph({ir:boundedQuery,context,catalog,requestParameters:graphParams,validate,compile:plannedCompile,db,requestId});
  }

  if(graphCost+vectorCost>ir.limits.max_cost) throw new RetrievalExecutionError("RETRIEVAL_COST_EXCEEDED","Combined retrieval exceeds the request budget",{graph_cost:graphCost,vector_cost:vectorCost,max_cost:ir.limits.max_cost});

  if(vector){
    const embedding=requestParameters[vector.query_parameter];
    vectorResult=await executeVector({catalog,catalogRef:vector.catalog_ref,embedding,topK:vector.top_k,maxResults:ir.limits.max_results,maxCost:ir.limits.max_cost-graphCost,identityField:vector.identity_field,context,db,requestId});
  }

  const graphCandidates=graph?normalizeRetrievalRows({rows:graphResult.rows,columns:graphResult.columns,identityField:graph.identity_field,source:"graph"}):[];
  const vectorCandidates=vector?normalizeRetrievalRows({rows:vectorResult.rows,columns:vectorResult.columns,identityField:vector.identity_field,source:"vector"}):[];
  const fused=fuseWeightedRRF({
    vectorCandidates,
    graphCandidates,
    vectorWeight:ir.fusion.vector_weight,
    graphWeight:ir.fusion.graph_weight,
    maxResults:ir.limits.max_results
  });

  const executionMs=Date.now()-started;
  if(observability) observability.observe("vibe_retrieval_duration_ms",executionMs,{source:"hybrid"});
  return {
    version:"v1",
    request_id:requestId,
    timing_ms:{execution:executionMs},
    cost:{graph:graphCost,vector:vectorCost,total:graphCost+vectorCost,max:ir.limits.max_cost},
    sources:{graph:graphCandidates.length,vector:vectorCandidates.length},
    explain:{
      fusion:{strategy:ir.fusion.strategy,vector_weight:ir.fusion.vector_weight,graph_weight:ir.fusion.graph_weight},
      candidate_limits:{max_results:ir.limits.max_results,max_cost:ir.limits.max_cost}
    },
    rows:fused,
    count:fused.length
  };
}