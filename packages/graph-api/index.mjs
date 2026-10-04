import http from "node:http";
import {randomUUID} from "node:crypto";
import {buildCatalog,verifyHs256Jwt} from "../schema-catalog-api/index.mjs";
import {validateQuery,DEFAULT_LIMITS} from "../query-validation/index.mjs";
import {compileAgeQuery} from "../compiler-age/index.mjs";
import {createPgExecutor,executeGraphQuery} from "../execution-engine/index.mjs";
import {validateMutation} from "../mutation-validation/index.mjs";
import {compileAgeMutation} from "../compiler-age-mutation/index.mjs";
import {createPgMutationExecutor,executeGraphMutation,MutationExecutionError} from "../mutation-execution/index.mjs";

const MAX_BODY=1024*1024;

function json(res,status,payload){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(payload));}
async function body(req){
  let text=""; for await(const chunk of req){text+=chunk;if(text.length>MAX_BODY)throw new Error("Request body too large");}
  if(!text)return {};
  return JSON.parse(text);
}

async function loadCatalog(client,claims){
  await client.query("BEGIN");
  try{
    await client.query("SELECT set_config($1,$2,true)",["request.jwt.claims",JSON.stringify(claims)]);
    const result=await client.query(
      `SELECT object_name AS graph_name,tenant_id,
              metadata->>'graph_object_kind' AS graph_object_kind,
              parent_name AS object_name,
              metadata->>'from_label' AS from_label,
              metadata->>'to_label' AS to_label,
              metadata->'properties' AS properties
         FROM vibe_meta.schema_catalog_entries
        WHERE catalog_version='v1' AND object_kind='graph'
        ORDER BY object_name,parent_name`
    );
    await client.query("COMMIT");
    return buildCatalog(result.rows);
  }catch(error){await client.query("ROLLBACK");throw error;}
}

function contextFromClaims(claims){
  return {
    trusted:true,
    tenantId:claims.tenant_id,
    role:claims.role??"authenticated",
    capabilities:Array.isArray(claims.capabilities)?claims.capabilities:[],
    trustedBackend:claims.trusted_backend===true
  };
}

export function createGraphApiServer({pool,jwtSecret,host="127.0.0.1",port=0,limits=DEFAULT_LIMITS}={}){
  if(!pool||!jwtSecret)throw new Error("pool and jwtSecret are required");
  const server=http.createServer(async(req,res)=>{
    const requestId=randomUUID();
    try{
      if(!["POST"].includes(req.method)||!["/v1/graph/query","/v1/graph/mutation"].includes(req.url)){
        json(res,404,{error:{version:"v1",code:"NOT_FOUND",message:"Not found",request_id:requestId}});return;
      }
      const auth=req.headers.authorization??"";
      if(!auth.startsWith("Bearer "))throw Object.assign(new Error("Bearer token required"),{status:401,code:"UNAUTHORIZED"});
      const claims=verifyHs256Jwt(auth.slice(7),jwtSecret);
      const context=contextFromClaims(claims);
      const input=await body(req);
      if(!input.ir||typeof input.ir!=="object")throw Object.assign(new Error("ir is required"),{status:400,code:"INVALID_REQUEST"});
      const client=await pool.connect();
      try{
        const catalog=await loadCatalog(client,claims);
        if(req.url==="/v1/graph/query"){
          const db=createPgExecutor(client);
          const result=await executeGraphQuery({ir:input.ir,context,catalog,requestParameters:input.parameters??{},limits,validate:validateQuery,compile:compileAgeQuery,db,requestId});
          json(res,200,result);return;
        }
        const validation=validateMutation(input.ir,context,catalog);
        if(!validation.ok){json(res,400,{error:{version:"v1",code:"VALIDATION_FAILED",message:"Mutation validation failed",request_id:requestId,details:validation.errors}});return;}
        const db=createPgMutationExecutor(client,context);
        const result=await executeGraphMutation({ir:input.ir,context,catalog,requestParameters:input.parameters??{},db,requestId});
        json(res,200,result);
      }finally{client.release();}
    }catch(error){
      const status=error?.status??(error?.code==="VALIDATION_FAILED"?400:500);
      const safeCode=error?.code??"INTERNAL_ERROR";
      const message=status<500?error.message:"Request failed";
      json(res,status,{error:{version:"v1",code:safeCode,message,request_id:requestId}});
    }
  });
  return {
    server,
    listen:()=>new Promise(resolve=>server.listen(port,host,()=>resolve(server.address()))),
    close:()=>new Promise(resolve=>server.close(resolve))
  };
}
