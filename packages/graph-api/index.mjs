import {CAPABILITIES,hasCapability} from "../capability-policy/index.mjs";
import http from "node:http";
import {randomUUID} from "node:crypto";
import {Pool} from "pg";
import {verifyHs256Jwt} from "../schema-catalog-api/index.mjs";
import {createExecutionContext,ExecutionContextError} from "../execution-context/index.mjs";
import {validateQuery} from "../query-validation/index.mjs";
import {compileAge} from "../compiler-age/index.mjs";
import {executeGraphQuery,createPgExecutor,ExecutionError} from "../execution-engine/index.mjs";
import {executeGraphMutation,createPgMutationExecutor,MutationExecutionError} from "../mutation-execution/index.mjs";
import {executeRetrieval,RetrievalExecutionError} from "../retrieval-execution/index.mjs";
import {createAuditEvent,emitAudit} from "../audit/index.mjs";

function json(res,status,payload){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(payload));}
async function body(req){let data="";for await(const chunk of req)data+=chunk;if(data.length>1024*1024)throw new Error("BODY_TOO_LARGE");return data?JSON.parse(data):{};}
function contextFromClaims(claims,requestId){return createExecutionContext(claims,{requestId});}

export function createGraphApiServer({pool,jwtSecret,catalogProvider,auditSink,verifyApproval,host="127.0.0.1",port=0}={}){
  if(!pool||!jwtSecret||typeof catalogProvider!=="function")throw new Error("pool, jwtSecret and catalogProvider are required");
  const server=http.createServer(async(req,res)=>{
    const requestId=randomUUID();
    let context=null;
    let auditInput=null;
    const record=async(outcome,errorCode=null)=>{try{await emitAudit(auditSink,createAuditEvent({
      requestId,context,route:req.url,tool:req.headers["x-vibe-mcp-tool"]??null,
      operation:auditInput?.ir?.operation??auditInput?.ir?.kind??null,graph:auditInput?.ir?.graph??null,outcome,errorCode,
      approvalId:auditInput?.execution?.approval?.id??null
    }));}catch{}};
    try{
      if(req.method==="GET"&&req.url==="/health")return json(res,200,{version:"v1",status:"ok"});
      const isCatalog=req.method==="GET"&&req.url==="/v1/schema/catalog";
      const isGraphRequest=req.method==="POST"&&["/v1/graph/query","/v1/graph/mutations"].includes(req.url);
      const isRetrievalRequest=req.method==="POST"&&req.url==="/v1/retrieval/query";
      if(!isCatalog&&!isGraphRequest&&!isRetrievalRequest)return json(res,404,{error:{version:"v1",code:"NOT_FOUND",message:"Not found",request_id:requestId}});
      const auth=req.headers.authorization??"";
      if(!auth.startsWith("Bearer ")){await record("denied","UNAUTHORIZED");return json(res,401,{version:"v1",code:"UNAUTHORIZED",message:"Bearer token required",request_id:requestId});}
      const claims=verifyHs256Jwt(auth.slice(7),jwtSecret);
      context=contextFromClaims(claims,requestId);
      if(isCatalog&&!hasCapability(context,CAPABILITIES.GRAPH_READ)){
        await record("denied","CAPABILITY_DENIED");
        return json(res,403,{version:"v1",code:"CAPABILITY_DENIED",message:"graph:read capability is required for Schema Catalog discovery",request_id:requestId});
      }
      if(isCatalog){
        const catalog=await catalogProvider(context);
        await record("success");
        return json(res,200,catalog);
      }
      const input=await body(req);
      auditInput=input;
      if(isRetrievalRequest){
        const sources=input.ir?.sources??{};
        if(sources.graph&&!hasCapability(context,CAPABILITIES.GRAPH_READ)){
          await record("denied","CAPABILITY_DENIED");
          return json(res,403,{version:"v1",code:"CAPABILITY_DENIED",message:"graph:read capability is required for graph retrieval",request_id:requestId});
        }
        if(sources.vector&&!hasCapability(context,CAPABILITIES.VECTOR_READ)){
          await record("denied","CAPABILITY_DENIED");
          return json(res,403,{version:"v1",code:"CAPABILITY_DENIED",message:"vector:read capability is required for vector retrieval",request_id:requestId});
        }
      }
      const catalog=await catalogProvider(context);
      if(isRetrievalRequest){
        const client=await pool.connect();
        try{
          const result=await executeRetrieval({ir:input.ir,context,catalog,requestParameters:input.parameters??{},db:createPgExecutor(client,context),requestId});
          await record("success");
          return json(res,200,result);
        }finally{client.release();}
      }
      const client=await pool.connect();
      try{
        if(req.url==="/v1/graph/query"){
          const result=await executeGraphQuery({ir:input.ir,context,catalog,requestParameters:input.parameters??{},validate:validateQuery,compile:compileAge,db:createPgExecutor(client,context),requestId});
          await record("success");
          return json(res,200,result);
        }
        const result=await executeGraphMutation({
          ir:input.ir,context,catalog,requestParameters:input.parameters??{},db:createPgMutationExecutor(client,context),
          requestId,mode:input.execution?.mode??"execute",approval:input.execution?.approval,verifyApproval
        });
        await record("success");
        return json(res,200,result);
      }finally{client.release();}
    }catch(error){
      await record("error",error?.code??"INTERNAL_ERROR");
      if(error?.code==="BODY_TOO_LARGE")return json(res,413,{error:{version:"v1",code:"BODY_TOO_LARGE",message:"Request body is too large",request_id:requestId}});
      if(error?.code==="UNAUTHORIZED"||error instanceof ExecutionContextError||error?.message?.includes("Bearer token"))return json(res,401,{version:"v1",code:"UNAUTHORIZED",message:error.message,request_id:requestId});
      if(error instanceof ExecutionError||error instanceof MutationExecutionError)return json(res,400,error.toJSON());
      if(error instanceof RetrievalExecutionError)return json(res,400,{version:"v1",code:error.code,message:error.message,details:error.details,request_id:requestId});
      return json(res,500,{version:"v1",code:"INTERNAL_ERROR",message:"Graph API request failed",request_id:requestId});
    }
  });
  return {server,listen:()=>new Promise(resolve=>server.listen(port,host,()=>resolve(server.address()))),close:()=>new Promise(resolve=>server.close(resolve))};
}
export function createPool(connectionString){return new Pool({connectionString});}
