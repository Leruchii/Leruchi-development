import http from "node:http";
import {randomUUID} from "node:crypto";
import {Pool} from "pg";
import {verifyHs256Jwt} from "../schema-catalog-api/index.mjs";
import {validateQuery} from "../query-validation/index.mjs";
import {compileAge} from "../compiler-age/index.mjs";
import {executeGraphQuery,createPgExecutor,ExecutionError} from "../execution-engine/index.mjs";
import {validateMutation} from "../mutation-validation/index.mjs";
import {compileAgeMutation} from "../compiler-age-mutation/index.mjs";
import {executeGraphMutation,createPgMutationExecutor,MutationExecutionError} from "../mutation-execution/index.mjs";

function json(res,status,payload){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(payload));}
async function body(req){let data="";for await(const chunk of req)data+=chunk;if(data.length>1024*1024)throw new Error("BODY_TOO_LARGE");return data?JSON.parse(data):{};}
function contextFromClaims(claims){return{trusted:true,tenantId:claims.tenant_id,role:claims.role??"authenticated",capabilities:Array.isArray(claims.capabilities)?claims.capabilities:[],trustedBackend:claims.trusted_backend===true};}

export function createGraphApiServer({pool,jwtSecret,catalogProvider,host="127.0.0.1",port=0}={}){
  if(!pool||!jwtSecret||typeof catalogProvider!=="function")throw new Error("pool, jwtSecret and catalogProvider are required");
  const server=http.createServer(async(req,res)=>{
    const requestId=randomUUID();
    try{
      if(req.method==="GET"&&req.url==="/health"){return json(res,200,{version:"v1",status:"ok"});}
      if(!["POST"].includes(req.method)||!["/v1/graph/query","/v1/graph/mutations"].includes(req.url))return json(res,404,{error:{version:"v1",code:"NOT_FOUND",message:"Not found",request_id:requestId}});
      const auth=req.headers.authorization??"";
      if(!auth.startsWith("Bearer "))return json(res,401,{version:"v1",code:"UNAUTHORIZED",message:"Bearer token required",request_id:requestId});
      const claims=verifyHs256Jwt(auth.slice(7),jwtSecret);
      const context=contextFromClaims(claims);
      const input=await body(req);
      const catalog=await catalogProvider(context);
      const client=await pool.connect();
      try{
        if(req.url==="/v1/graph/query"){
          const result=await executeGraphQuery({ir:input.ir,context,catalog,requestParameters:input.parameters??{},validate:validateQuery,compile:compileAge,db:createPgExecutor(client,context),requestId});
          return json(res,200,result);
        }
        const result=await executeGraphMutation({ir:input.ir,context,catalog,requestParameters:input.parameters??{},db:createPgMutationExecutor(client,context),requestId});
        return json(res,200,result);
      }finally{client.release();}
    }catch(error){
      if(error?.code==="BODY_TOO_LARGE")return json(res,413,{error:{version:"v1",code:"BODY_TOO_LARGE",message:"Request body is too large",request_id:requestId}});
      if(error?.message?.startsWith("Invalid JWT")||error?.message?.includes("Bearer token"))return json(res,401,{version:"v1",code:"UNAUTHORIZED",message:error.message,request_id:requestId});
      if(error instanceof ExecutionError||error instanceof MutationExecutionError)return json(res,400,error.toJSON());
      return json(res,500,{version:"v1",code:"INTERNAL_ERROR",message:"Graph API request failed",request_id:requestId});
    }
  });
  return {server,listen:()=>new Promise(resolve=>server.listen(port,host,()=>resolve(server.address()))),close:()=>new Promise(resolve=>server.close(resolve))};
}
export function createPool(connectionString){return new Pool({connectionString});}
