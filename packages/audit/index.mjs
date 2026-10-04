export function createAuditEvent({requestId,context,route,tool,operation,graph,outcome,errorCode,approvalId}){
  return Object.freeze({
    version:"v1",
    timestamp:new Date().toISOString(),
    request_id:requestId,
    tenant_id:context?.tenantId??null,
    actor_role:context?.role??null,
    capabilities:Array.isArray(context?.capabilities)?[...context.capabilities]:[],
    route:route??null,
    tool:tool??null,
    operation:operation??null,
    graph:graph??null,
    outcome,
    error_code:errorCode??null,
    approval_id:approvalId??null
  });
}

export async function emitAudit(auditSink,event){
  if(typeof auditSink!=="function")return;
  await auditSink(event);
}
