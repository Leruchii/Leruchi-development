import {hashContextIR,validateContextIR} from "./index.mjs";

export function explainContext({ir,context}={}){
  try{validateContextIR(ir);}catch{
    return Object.freeze({version:"v1",status:"rejected",reason_code:"CONTEXT_IR_INVALID",request:{valid:false},ir_hash:undefined});
  }
  const capabilities=new Set(context?.capabilities??[]);
  const sources=ir.sources.map(source=>{
    const required=source.type==="retrieval"
      ?[...(source.ir?.sources?.graph?["graph:read"]:[]),...(source.ir?.sources?.vector?["vector:read"]:[])]
      :["graph:read"];
    return {type:source.type,authorized:required.every(capability=>capabilities.has(capability)),required_capabilities:required};
  });
  const unsupported=ir.sources.some(source=>source.type==="records");
  const unauthorized=sources.filter(s=>!s.authorized);
  return Object.freeze({
    version:"v1",
    status:unsupported||unauthorized.length?"rejected":"ready",
    reason_code:unsupported?"CONTEXT_SOURCE_UNSUPPORTED":unauthorized.length?"CONTEXT_CAPABILITY_DENIED":"CONTEXT_READY",
    request:{valid:true},
    source_summary:sources.map(s=>({type:s.type,authorized:s.authorized})),
    budget:{max_items:ir.budget.max_items,max_bytes:ir.budget.max_bytes},
    freshness:{mode:ir.freshness.mode,max_age_seconds:ir.freshness.max_age_seconds},
    execution:"not_executed",
    ir_hash:hashContextIR(ir)
  });
}