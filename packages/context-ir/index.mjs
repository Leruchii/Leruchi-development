import {createHash} from "node:crypto";

const IDENT=/^[A-Za-z_][A-Za-z0-9_.]*$/;
const MAX_ITEMS=1000;
const MAX_BYTES=1024*1024;

function fail(code,message){const error=new Error(message);error.code=code;return error;}
function canonical(value){
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
  return JSON.stringify(value);
}
function validateSource(source){
  if(!source||typeof source!=="object"||Array.isArray(source))throw fail("INVALID_CONTEXT_SOURCE","Each context source must be an object");
  if(!["schema","query","retrieval","records"].includes(source.type))throw fail("INVALID_CONTEXT_SOURCE","Unsupported context source type");
  if(Object.hasOwn(source,"tenant_id")||Object.hasOwn(source,"tenantId")||Object.hasOwn(source,"access_token")||Object.hasOwn(source,"authorization"))throw fail("INVALID_CONTEXT_SOURCE","Tenant identity and credentials cannot be supplied in Context IR");
  if(source.catalog_ref!==undefined&&(!IDENT.test(source.catalog_ref)))throw fail("INVALID_CONTEXT_SOURCE","catalog_ref must be a safe reference");
  if(source.identity_field!==undefined&&(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(source.identity_field)))throw fail("INVALID_CONTEXT_SOURCE","identity_field must be a safe identifier");
  if(source.limit!==undefined&&(!Number.isInteger(source.limit)||source.limit<1||source.limit>MAX_ITEMS))throw fail("CONTEXT_LIMIT_EXCEEDED","Source limit must be between 1 and 1000");
  if(source.fields!==undefined&&(!Array.isArray(source.fields)||source.fields.length>100||source.fields.some(f=>typeof f!=="string"||!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(f))))throw fail("INVALID_CONTEXT_SOURCE","fields must contain safe field references");
  if(source.type==="schema"&&(source.ir!==undefined||source.identity_field!==undefined))throw fail("INVALID_CONTEXT_SOURCE","Schema context cannot carry query or record identity fields");
  if(["query","retrieval"].includes(source.type)&&(!source.ir||typeof source.ir!=="object"||Array.isArray(source.ir)))throw fail("INVALID_CONTEXT_SOURCE","Query and retrieval sources require a structured IR");
}
export function validateContextIR(ir){
  if(!ir||typeof ir!=="object"||Array.isArray(ir))throw fail("INVALID_CONTEXT_IR","Context IR must be an object");
  if(ir.version!=="v1"||ir.kind!=="context_request")throw fail("INVALID_CONTEXT_IR","Unsupported Context IR version or kind");
  if(typeof ir.purpose!=="string"||ir.purpose.length<1||ir.purpose.length>500)throw fail("INVALID_CONTEXT_IR","purpose must be 1-500 characters");
  if(!Array.isArray(ir.sources)||ir.sources.length<1||ir.sources.length>32)throw fail("INVALID_CONTEXT_IR","sources must contain 1-32 entries");
  ir.sources.forEach(validateSource);
  if(!ir.budget||!Number.isInteger(ir.budget.max_items)||ir.budget.max_items<1||ir.budget.max_items>MAX_ITEMS)throw fail("CONTEXT_LIMIT_EXCEEDED","max_items must be between 1 and 1000");
  if(!Number.isInteger(ir.budget.max_bytes)||ir.budget.max_bytes<1024||ir.budget.max_bytes>MAX_BYTES)throw fail("CONTEXT_LIMIT_EXCEEDED","max_bytes must be between 1024 and 1048576");
  if(!ir.freshness||!["current","bounded_stale","cache_preferred"].includes(ir.freshness.mode))throw fail("INVALID_CONTEXT_FRESHNESS","Unsupported freshness mode");
  if(ir.freshness.mode==="bounded_stale"&&(!Number.isInteger(ir.freshness.max_age_seconds)||ir.freshness.max_age_seconds<1||ir.freshness.max_age_seconds>86400))throw fail("INVALID_CONTEXT_FRESHNESS","bounded_stale requires max_age_seconds from 1 to 86400");
  if(ir.freshness.mode!=="bounded_stale"&&ir.freshness.max_age_seconds!==undefined)throw fail("INVALID_CONTEXT_FRESHNESS","max_age_seconds is only valid for bounded_stale");
  if(ir.output?.format!==undefined&&!["structured","text","hybrid"].includes(ir.output.format))throw fail("INVALID_CONTEXT_OUTPUT","Unsupported context output format");
  return ir;
}
export function canonicalizeContextIR(ir){validateContextIR(ir);return canonical(ir);}
export function hashContextIR(ir){return createHash("sha256").update(canonicalizeContextIR(ir)).digest("hex");}
