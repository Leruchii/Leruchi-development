import {randomUUID} from "node:crypto";
import {validateMutation} from "../mutation-validation/index.mjs";
import {compileAgeMutation} from "../compiler-age-mutation/index.mjs";
export class MutationExecutionError extends Error{constructor(code,message,details,requestId=randomUUID()){super(message);this.name="MutationExecutionError";this.code=code;this.details=details;this.requestId=requestId}toJSON(){return{version:"v1",code:this.code,message:this.message,request_id:this.requestId,...(this.details===undefined?{}:{details:this.details})}}}
export async function executeGraphMutation({ir,context,catalog,requestParameters={},db,requestId=randomUUID()}){
  if(context?.trusted!==true)throw new MutationExecutionError("UNTRUSTED_CONTEXT","Trusted execution context is required",undefined,requestId);
  const v=validateMutation(ir,context,catalog);if(!v.ok)throw new MutationExecutionError("VALIDATION_FAILED","Mutation validation failed",v.errors,requestId);
  const declared=new Map(ir.parameters.map(p=>[p.name,p]));
  for(const k of Object.keys(requestParameters))if(!declared.has(k))throw new MutationExecutionError("UNDECLARED_PARAMETER","Request contains an undeclared parameter",{parameter:k},requestId);
  for(const [name,p] of declared)if(p.required&&!Object.hasOwn(requestParameters,name))throw new MutationExecutionError("MISSING_PARAMETER","A required mutation parameter is missing",{parameter:name},requestId);
  const compiled=compileAgeMutation(ir,{tenantId:context.tenantId});
  if(Object.hasOwn(requestParameters,"__vibe_tenant_id"))throw new MutationExecutionError("TENANT_PARAMETER_FORBIDDEN","Tenant binding cannot be overridden",undefined,requestId);
  const params={...compiled.literalBindings,...requestParameters};
  let began=false;try{await db.begin();began=true;const result=await db.execute(compiled,params);await db.commit();began=false;return{version:"v1",request_id:requestId,operation:ir.operation,audit:{request_id:requestId,tenant_id:context.tenantId,graph:ir.graph,operation:ir.operation,target:ir.target.label},columns:compiled.columns,rows:Array.isArray(result.rows)?result.rows:[],count:Array.isArray(result.rows)?result.rows.length:0};}catch(e){if(began)try{await db.rollback()}catch{}throw new MutationExecutionError("DATABASE_EXECUTION_FAILED","Mutation execution failed",undefined,requestId)}
}