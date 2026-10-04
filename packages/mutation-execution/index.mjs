import {createHash, randomUUID} from "node:crypto";
import {validateMutation} from "../mutation-validation/index.mjs";
import {compileAgeMutation} from "../compiler-age-mutation/index.mjs";

export class MutationExecutionError extends Error{
  constructor(code,message,details,requestId=randomUUID()){super(message);this.name="MutationExecutionError";this.code=code;this.details=details;this.requestId=requestId}
  toJSON(){return{version:"v1",code:this.code,message:this.message,request_id:this.requestId,...(this.details===undefined?{}:{details:this.details})}}
}

function targetIdFromResult(result){
  const row=Array.isArray(result?.rows)&&result.rows.length?result.rows[0]:undefined;
  if(Array.isArray(row)) return row[1];
  if(row&&typeof row==="object") return row.target_id;
  return undefined;
}

function targetKind(operation){return operation.endsWith("_edge")?"edge":"vertex"}

export function createPgMutationExecutor(client,context){
  return {
    async begin(){
      if(!context?.tenantId) throw new Error("TRUSTED_TENANT_CONTEXT_REQUIRED");
      await client.query("BEGIN");
      try{
        await client.query("SELECT set_config($1,$2,true)",["request.jwt.claims",JSON.stringify({
          tenant_id:context.tenantId,
          role:context.role??"authenticated",
          capabilities:context.capabilities??[]
        })]);
      }catch(error){
        try{await client.query("ROLLBACK")}catch{}
        throw error;
      }
    },
    async execute(compiled,parameterMap){
      const statementName="vibe_mutation_"+createHash("sha256").update(compiled.sql).digest("hex").slice(0,20);
      return client.query({name:statementName,text:compiled.sql,values:[JSON.stringify(parameterMap)],rowMode:"array"});
    },
    async insertOutbox(event){
      await client.query(
        `INSERT INTO vibe_meta.graph_event_outbox
          (event_id,tenant_id,graph_name,operation,target_kind,target_label,target_id,request_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [event.eventId,event.tenantId,event.graph,event.operation,event.targetKind,event.targetLabel,String(event.targetId),event.requestId]
      );
      await client.query("SELECT pg_notify($1,$2)",["vibe_graph_events",event.eventId]);
    },
    async commit(){await client.query("COMMIT")},
    async rollback(){await client.query("ROLLBACK")}
  };
}

export async function executeGraphMutation({ir,context,catalog,requestParameters={},db,requestId=randomUUID()}){
  if(context?.trusted!==true)throw new MutationExecutionError("UNTRUSTED_CONTEXT","Trusted execution context is required",undefined,requestId);
  const v=validateMutation(ir,context,catalog);if(!v.ok)throw new MutationExecutionError("VALIDATION_FAILED","Mutation validation failed",v.errors,requestId);
  const declared=new Map(ir.parameters.map(p=>[p.name,p]));
  for(const k of Object.keys(requestParameters))if(!declared.has(k))throw new MutationExecutionError("UNDECLARED_PARAMETER","Request contains an undeclared parameter",{parameter:k},requestId);
  for(const [name,p] of declared)if(p.required&&!Object.hasOwn(requestParameters,name))throw new MutationExecutionError("MISSING_PARAMETER","A required mutation parameter is missing",{parameter:name},requestId);
  const compiled=compileAgeMutation(ir,{tenantId:context.tenantId});
  if(Object.hasOwn(requestParameters,"__vibe_tenant_id"))throw new MutationExecutionError("TENANT_PARAMETER_FORBIDDEN","Tenant binding cannot be overridden",undefined,requestId);
  const params={...compiled.literalBindings,...requestParameters};
  let began=false;
  try{
    await db.begin();began=true;
    const result=await db.execute(compiled,params);
    const count=Array.isArray(result.rows)?result.rows.length:0;
    if(count>0&&typeof db.insertOutbox==="function"){
      const targetId=targetIdFromResult(result);
      if(targetId===undefined||targetId===null)throw new MutationExecutionError("MISSING_TARGET_ID","Mutation did not return a realtime target id",undefined,requestId);
      await db.insertOutbox({
        eventId:randomUUID(),
        requestId,
        tenantId:context.tenantId,
        graph:ir.graph,
        operation:ir.operation,
        targetKind:targetKind(ir.operation),
        targetLabel:ir.target.label,
        targetId
      });
    }
    await db.commit();began=false;
    return{version:"v1",request_id:requestId,operation:ir.operation,audit:{request_id:requestId,tenant_id:context.tenantId,graph:ir.graph,operation:ir.operation,target:ir.target.label},columns:compiled.columns,rows:Array.isArray(result.rows)?result.rows:[],count};
  }catch(e){
    if(began)try{await db.rollback()}catch{}
    if(e instanceof MutationExecutionError)throw e;
    throw new MutationExecutionError("DATABASE_EXECUTION_FAILED","Mutation execution failed",undefined,requestId);
  }
}
