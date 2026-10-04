import {createHash} from "node:crypto";

const IDENTIFIER=/^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_RESULTS=1000;
const MAX_COST=100;

function canonical(value){
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
  return JSON.stringify(value);
}

function fail(code,message){const error=new Error(message);error.code=code;return error;}

export function validateRetrievalIR(ir){
  if(!ir||typeof ir!=="object")throw fail("INVALID_RETRIEVAL_IR","Retrieval IR must be an object");
  if(ir.version!=="v1"||ir.kind!=="retrieval_query")throw fail("INVALID_RETRIEVAL_IR","Unsupported retrieval IR version or kind");
  if(!ir.sources||typeof ir.sources!=="object"||(!ir.sources.vector&&!ir.sources.graph))throw fail("INVALID_RETRIEVAL_IR","At least one retrieval source is required");
  if(ir.sources.vector){
    const v=ir.sources.vector;
    if(typeof v.catalog_ref!=="string"||!v.catalog_ref)throw fail("INVALID_RETRIEVAL_IR","Vector catalog_ref is required");
    if(typeof v.query_parameter!=="string"||!IDENTIFIER.test(v.query_parameter))throw fail("INVALID_RETRIEVAL_IR","Vector query_parameter must be a safe identifier");
    if(!Number.isInteger(v.top_k)||v.top_k<1||v.top_k>MAX_RESULTS)throw fail("RETRIEVAL_LIMIT_EXCEEDED","Vector top_k must be between 1 and 1000");
  }
  if(ir.sources.graph){
    const g=ir.sources.graph;
    if(!g.query||typeof g.query!=="object"||g.query.tenant_id||g.query.tenantId)throw fail("INVALID_RETRIEVAL_IR","Graph source must use canonical Query IR without tenant override fields");
    if(g.candidate_limit!==undefined&&(!Number.isInteger(g.candidate_limit)||g.candidate_limit<1||g.candidate_limit>MAX_RESULTS))throw fail("RETRIEVAL_LIMIT_EXCEEDED","Graph candidate_limit must be between 1 and 1000");
  }
  if(!ir.fusion||ir.fusion.strategy!=="weighted_rrf")throw fail("INVALID_RETRIEVAL_IR","Only weighted_rrf fusion is supported in v1");
  if(ir.fusion.vector_weight!==undefined&&(!(ir.fusion.vector_weight>0)||!Number.isFinite(ir.fusion.vector_weight)))throw fail("INVALID_RETRIEVAL_IR","vector_weight must be positive");
  if(ir.fusion.graph_weight!==undefined&&(!(ir.fusion.graph_weight>0)||!Number.isFinite(ir.fusion.graph_weight)))throw fail("INVALID_RETRIEVAL_IR","graph_weight must be positive");
  if(!ir.limits||!Number.isInteger(ir.limits.max_results)||ir.limits.max_results<1||ir.limits.max_results>MAX_RESULTS)throw fail("RETRIEVAL_LIMIT_EXCEEDED","max_results must be between 1 and 1000");
  if(!Number.isInteger(ir.limits.max_cost)||ir.limits.max_cost<1||ir.limits.max_cost>MAX_COST)throw fail("RETRIEVAL_COST_EXCEEDED","max_cost must be between 1 and 100");
  return ir;
}

export function canonicalizeRetrievalIR(ir){validateRetrievalIR(ir);return canonical(ir);}
export function hashRetrievalIR(ir){return createHash("sha256").update(canonicalizeRetrievalIR(ir)).digest("hex");}
