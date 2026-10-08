import {CAPABILITIES,hasCapability} from "../capability-policy/index.mjs";
import {verifyCapabilityGrant,isCapabilityGrantScopeAllowed} from "../capability-policy/grants.mjs";
import {verifyEdDsaCapabilityGrant} from "../capability-policy/jwt.mjs";
import {isDestructiveMutation} from "../mutation-approval/index.mjs";
import http from "node:http";
import {randomUUID} from "node:crypto";
import {Pool} from "pg";
import {verifyHs256Jwt} from "../schema-catalog-api/index.mjs";
import {createExecutionContext,ExecutionContextError} from "../execution-context/index.mjs";
import {validateQuery} from "../query-validation/index.mjs";
import {compileAge} from "../compiler-age/index.mjs";
import {compilePostgresqlRecursive} from "../compiler-postgresql-recursive/index.mjs";
import {engineCapabilities,planQuery} from "../planner/index.mjs";
import {executeGraphQuery,createPgExecutor,ExecutionError} from "../execution-engine/index.mjs";
import {executeGraphMutation,createPgMutationExecutor,MutationExecutionError} from "../mutation-execution/index.mjs";
import {executeRetrieval,RetrievalExecutionError} from "../retrieval-execution/index.mjs";
import {explainRetrieval} from "../retrieval-explainability/index.mjs";
import {explainContext} from "../context-ir/explain.mjs";
import {resolveContext,preflightContext,ContextResolutionError} from "../context-resolution/index.mjs";
import {explainCrossModalPlan} from "../cross-modal-planner/index.mjs";
import {validateAgentIntent,preflightAgentIntent,explainAgentIntent,AgentIntentError} from "../agent-intent/index.mjs";
import {createAuditEvent,emitAudit} from "../audit/index.mjs";
import {createObservability} from "../observability/index.mjs";
import {evaluateAgentCases} from "../agent-evaluation/index.mjs";
import {createAgentTrace,replayAgentTrace} from "../agent-trace-replay/index.mjs";

function json(res,status,payload){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify(payload));}
async function body(req){let data="";for await(const chunk of req)data+=chunk;if(data.length>1024*1024)throw new Error("BODY_TOO_LARGE");return data?JSON.parse(data):{};}
function contextFromClaims(claims,requestId){return createExecutionContext(claims,{requestId});}

export const DEFAULT_QUERY_ENGINE_CAPABILITIES=engineCapabilities({
  age:{available:true,features:["graph_query"]}
});

export function resolveQueryCompiler(ir,catalog,{
  engines=DEFAULT_QUERY_ENGINE_CAPABILITIES,
  preferred=["apache-age","postgresql-recursive"],
  observability
}={}){
  const plan=planQuery(ir,{engines,preferred});
  let compile;
  if(plan.engine==="apache-age") compile=queryIr=>compileAge(queryIr);
  else if(plan.engine==="postgresql-recursive") compile=queryIr=>compilePostgresqlRecursive(queryIr,catalog);
  else throw new Error("UNSUPPORTED_PLANNED_ENGINE");

  if(observability){
    observability.increment("vibe_query_planner_total",1,{
      engine:plan.engine,
      reason:plan.reason
    });
  }
  return {plan,compile};
}

export function createGraphApiServer({pool,jwtSecret,jwtIssuer=null,jwtAudience=null,capabilityPublicKeys=null,catalogProvider,auditSink,verifyApproval,isGrantRevoked,requireCapabilityGrant=false,observability=createObservability(),queryEngines=DEFAULT_QUERY_ENGINE_CAPABILITIES,preferredQueryEngines=["apache-age","postgresql-recursive"],host="127.0.0.1",port=0}={}){
  if(!pool||(!jwtSecret&&!requireCapabilityGrant)||typeof catalogProvider!=="function")throw new Error("pool, a JWT verifier configuration and catalogProvider are required");
  const server=http.createServer(async(req,res)=>{
    const requestId=randomUUID();
    const started=Date.now();
    const span=observability.startSpan(req.method+" "+(req.url?.split("?")[0]??""),{traceparent:req.headers.traceparent});
    res.setHeader("x-vibe-request-id",requestId);
    res.setHeader("x-vibe-trace-id",span.context.traceId);
    let context=null;
    let capabilityGrant=null;
    let auditInput=null;
    const record=async(outcome,errorCode=null)=>{try{await emitAudit(auditSink,createAuditEvent({
      requestId,traceId:span.context.traceId,context,route:req.url?.split("?")[0]??null,tool:req.headers["x-vibe-mcp-tool"]??null,
      operation:auditInput?.ir?.operation??auditInput?.ir?.kind??null,graph:auditInput?.ir?.graph??null,outcome,errorCode,
      approvalId:auditInput?.execution?.approval?.id??null,durationMs:Date.now()-started
    }));}catch{}};
    try{
      if(req.method==="GET"&&req.url==="/health")return json(res,200,{version:"v1",status:"ok"});
      const isCatalog=req.method==="GET"&&req.url==="/v1/schema/catalog";
      const isGraphRequest=req.method==="POST"&&["/v1/graph/query","/v1/graph/mutations"].includes(req.url);
      const isRetrievalRequest=req.method==="POST"&&req.url==="/v1/retrieval/query";
      const isRetrievalExplain=req.method==="POST"&&req.url==="/v1/retrieval/explain";
      const isContextExplain=req.method==="POST"&&req.url==="/v1/context/explain";
      const isContextResolve=req.method==="POST"&&req.url==="/v1/context/resolve";
      const isAgentIntentExplain=req.method==="POST"&&req.url==="/v1/agent/intent/explain";
      const isCrossModalPlanExplain=req.method==="POST"&&req.url==="/v1/agent/plan/explain";
      const isAgentEvaluate=req.method==="POST"&&req.url==="/v1/agent/evaluate";
      const isAgentTrace=req.method==="POST"&&req.url==="/v1/agent/trace";
      const isAgentReplay=req.method==="POST"&&req.url==="/v1/agent/replay";
      if(!isCatalog&&!isGraphRequest&&!isRetrievalRequest&&!isRetrievalExplain&&!isContextExplain&&!isContextResolve&&!isAgentIntentExplain&&!isCrossModalPlanExplain&&!isAgentEvaluate&&!isAgentTrace&&!isAgentReplay)return json(res,404,{error:{version:"v1",code:"NOT_FOUND",message:"Not found",request_id:requestId}});
      const auth=req.headers.authorization??"";
      if(!auth.startsWith("Bearer ")){await record("denied","UNAUTHORIZED");return json(res,401,{version:"v1",code:"UNAUTHORIZED",message:"Bearer token required",request_id:requestId});}
      const claims=requireCapabilityGrant
        ?verifyEdDsaCapabilityGrant(auth.slice(7),{publicKeys:capabilityPublicKeys,issuer:jwtIssuer,audience:jwtAudience??"leruchi"})
        :verifyHs256Jwt(auth.slice(7),jwtSecret,Math.floor(Date.now()/1000),{issuer:jwtIssuer,audience:jwtAudience});
      if(!requireCapabilityGrant&&(claims.jti!==undefined||claims.aud==="leruchi")){
        const error=new Error("Capability grants must be verified with the configured EdDSA public keys");
        error.code="UNAUTHORIZED";
        throw error;
      }
      const grantRequired=requireCapabilityGrant;
      let trustedClaims=claims;
      if(grantRequired){
        const decision=await verifyCapabilityGrant(claims,{isRevoked:isGrantRevoked});
        if(!decision.ok){
          const error=new Error(decision.code==="CAPABILITY_REVOCATION_UNAVAILABLE"?"Capability revocation decision unavailable":"Capability grant was rejected");
          error.code=decision.code;
          throw error;
        }
        capabilityGrant=decision.grant;
        trustedClaims={...claims,tenant_id:decision.grant.tenant_id,capabilities:decision.grant.capabilities};
      }
      context=contextFromClaims(trustedClaims,requestId);
      if(isCatalog&&capabilityGrant&&!isCapabilityGrantScopeAllowed(capabilityGrant,"/v1/schema/catalog")){
        await record("denied","CAPABILITY_SCOPE_DENIED");
        return json(res,403,{version:"v1",code:"CAPABILITY_SCOPE_DENIED",message:"Capability grant scope does not permit Schema Catalog discovery",request_id:requestId});
      }
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
      if(capabilityGrant&&!isCapabilityGrantScopeAllowed(capabilityGrant,req.url,input?.ir?.graph)){
        await record("denied","CAPABILITY_SCOPE_DENIED");
        return json(res,403,{version:"v1",code:"CAPABILITY_SCOPE_DENIED",message:"Capability grant scope does not permit this route or graph",request_id:requestId});
      }
      if(req.url==="/v1/graph/query"&&!hasCapability(context,CAPABILITIES.GRAPH_READ)){
        await record("denied","CAPABILITY_DENIED");
        return json(res,403,{version:"v1",code:"CAPABILITY_DENIED",message:"graph:read capability is required for graph queries",request_id:requestId});
      }
      if(req.url==="/v1/graph/mutations"){
        if(!hasCapability(context,CAPABILITIES.GRAPH_WRITE)){
          await record("denied","CAPABILITY_DENIED");
          return json(res,403,{version:"v1",code:"CAPABILITY_DENIED",message:"graph:write capability is required for graph mutations",request_id:requestId});
        }
        if(isDestructiveMutation(input.ir)&&!hasCapability(context,CAPABILITIES.GRAPH_DELETE)){
          await record("denied","CAPABILITY_DENIED");
          return json(res,403,{version:"v1",code:"CAPABILITY_DENIED",message:"graph:delete capability is required for destructive graph mutations",request_id:requestId});
        }
      }
      if(isAgentEvaluate){
        const catalog=await catalogProvider(context);
        try{
          const result=evaluateAgentCases({request:input,context,catalog,observability,requestId});
          await record(result.status==="pass"?"success":"denied",result.status==="pass"?null:"AGENT_EVALUATION_FAILED");
          return json(res,200,{...result,request_id:requestId});
        }catch(error){
          await record("denied",error?.code??"INVALID_EVALUATION_REQUEST");
          return json(res,400,{version:"v1",code:error?.code??"INVALID_EVALUATION_REQUEST",message:error?.message??"Invalid evaluation request",request_id:requestId});
        }
      }
      if(isAgentTrace){
        try{
          const trace=createAgentTrace({traceId:randomUUID().replaceAll("-",""),requestId,artifactKind:input.artifact_kind??input.artifactKind,artifact:input.artifact,expected:input.expected??{},outcome:input.outcome,metadata:{case_name:input.case_name??input.caseName}});
          await record("success");
          return json(res,200,{...trace,request_id:requestId});
        }catch(error){
          await record("denied",error?.code??"INVALID_AGENT_TRACE");
          return json(res,400,{version:"v1",code:error?.code??"INVALID_AGENT_TRACE",message:error?.message??"Invalid agent trace",request_id:requestId});
        }
      }
      if(isAgentReplay){
        const catalog=await catalogProvider(context);
        try{
          const result=replayAgentTrace({trace:input.trace,context,catalog});
          await record(result.status==="pass"?"success":"denied",result.status==="pass"?null:"AGENT_REPLAY_REGRESSION");
          return json(res,200,{...result,request_id:requestId});
        }catch(error){
          await record("denied",error?.code??"INVALID_AGENT_TRACE");
          return json(res,400,{version:"v1",code:error?.code??"INVALID_AGENT_TRACE",message:error?.message??"Invalid agent trace",request_id:requestId});
        }
      }
      if(isCrossModalPlanExplain){
        const catalog=await catalogProvider(context);
        const explanation=explainCrossModalPlan({plan:input.plan,context,catalog,observability,requestId});
        await record(explanation.status==="ready"?"success":"denied",explanation.reason_code);
        return json(res,200,{...explanation,request_id:requestId});
      }
      if(isAgentIntentExplain){
        try{
          validateAgentIntent(input.intent);
          preflightAgentIntent({intent:input.intent,context});
        }catch(error){
          const status=error?.code==="AGENT_INTENT_CAPABILITY_DENIED"?403:error?.code==="UNTRUSTED_CONTEXT"?401:400;
          await record("denied",error?.code??"INVALID_AGENT_INTENT");
          return json(res,status,{version:"v1",code:error?.code??"INVALID_AGENT_INTENT",message:error?.message??"Invalid Agent Intent",request_id:requestId});
        }
        const catalog=await catalogProvider(context);
        const explanation=explainAgentIntent({intent:input.intent,context,catalog,observability,requestId});
        await record(explanation.status==="ready"?"success":"denied",explanation.reason_code);
        return json(res,200,{...explanation,request_id:requestId});
      }
      if(isContextExplain){
        const explanation=explainContext({ir:input.ir,context});
        await record(explanation.status==="ready"?"success":"denied",explanation.reason_code);
        return json(res,200,{...explanation,request_id:requestId});
      }
      if(isRetrievalExplain){
        const sources=input.ir?.sources??{};
        if(sources.graph&&!hasCapability(context,CAPABILITIES.GRAPH_READ)){
          await record("denied","CAPABILITY_DENIED");
          return json(res,403,{version:"v1",code:"CAPABILITY_DENIED",message:"graph:read capability is required for retrieval explanation",request_id:requestId});
        }
        if(sources.vector&&!hasCapability(context,CAPABILITIES.VECTOR_READ)){
          await record("denied","CAPABILITY_DENIED");
          return json(res,403,{version:"v1",code:"CAPABILITY_DENIED",message:"vector:read capability is required for retrieval explanation",request_id:requestId});
        }
        const explanation=explainRetrieval({ir:input.ir,context});
        await record(explanation.status==="ready"?"success":"denied",explanation.reason_code);
        return json(res,200,{...explanation,request_id:requestId});
      }
      auditInput=input;
      if(isContextResolve){
        preflightContext(input.ir,context,input.parameters??[]);
        const catalog=await catalogProvider(context);
        const client=await pool.connect();
        try{
          const db=createPgExecutor(client,context);
          const result=await resolveContext({
            ir:input.ir,
            context,
            parameterSets:input.parameters??[],
            requestId,
            observability,
            resolveSchema:async()=>catalog,
            executeQuery:async({source,parameters,limit})=>{
              const boundedIr={...source.ir,limit:Math.min(source.ir.limit??limit,limit)};
              const compile=queryIr=>resolveQueryCompiler(queryIr,catalog,{engines:queryEngines,preferred:preferredQueryEngines,observability}).compile(queryIr);
              return executeGraphQuery({ir:boundedIr,context,catalog,requestParameters:parameters,validate:validateQuery,compile,db,requestId,observability});
            },
            executeRetrieval:async({source,parameters,limit})=>{
              const sources={...source.ir.sources};
              if(sources.graph){
                const graphQuery={...sources.graph.query,limit:Math.min(sources.graph.query.limit??limit,limit)};
                sources.graph={...sources.graph,query:graphQuery,candidate_limit:Math.min(sources.graph.candidate_limit??graphQuery.limit,limit)};
              }
              if(sources.vector)sources.vector={...sources.vector,top_k:Math.min(sources.vector.top_k,limit)};
              const boundedIr={...source.ir,sources,limits:{...source.ir.limits,max_results:Math.min(source.ir.limits.max_results,limit)}};
              return executeRetrieval({ir:boundedIr,context,catalog,requestParameters:parameters,db,requestId,observability});
            }
          });
          await record("success");
          return json(res,200,result);
        }finally{client.release();}
      }
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
          const result=await executeRetrieval({ir:input.ir,context,catalog,requestParameters:input.parameters??{},db:createPgExecutor(client,context),requestId,observability});
          await record("success");
          return json(res,200,result);
        }finally{client.release();}
      }
      const client=await pool.connect();
      try{
        if(req.url==="/v1/graph/query"){
          const compile=queryIr=>resolveQueryCompiler(queryIr,catalog,{engines:queryEngines,preferred:preferredQueryEngines,observability}).compile(queryIr);
          const result=await executeGraphQuery({ir:input.ir,context,catalog,requestParameters:input.parameters??{},validate:validateQuery,compile,db:createPgExecutor(client,context),requestId,observability});
          await record("success");
          return json(res,200,result);
        }
        const result=await executeGraphMutation({
          ir:input.ir,context,catalog,requestParameters:input.parameters??{},db:createPgMutationExecutor(client,context),
          requestId,mode:input.execution?.mode??"execute",approval:input.execution?.approval,verifyApproval,observability
        });
        await record("success");
        return json(res,200,result);
      }finally{client.release();}
    }catch(error){
      await record("error",error?.code??"INTERNAL_ERROR");
      if(error?.code==="BODY_TOO_LARGE")return json(res,413,{error:{version:"v1",code:"BODY_TOO_LARGE",message:"Request body is too large",request_id:requestId}});
      if(error?.code==="CAPABILITY_REVOCATION_UNAVAILABLE")return json(res,503,{version:"v1",code:error.code,message:"Capability authorization is temporarily unavailable",request_id:requestId});
      if(error?.code==="INVALID_CAPABILITY_GRANT"||error?.code==="CAPABILITY_GRANT_REVOKED")return json(res,401,{version:"v1",code:error.code,message:"Capability grant was rejected",request_id:requestId});
      if(error?.code==="UNAUTHORIZED"||error instanceof ExecutionContextError||error?.message?.includes("Bearer token"))return json(res,401,{version:"v1",code:"UNAUTHORIZED",message:error.message,request_id:requestId});
      if(error instanceof ExecutionError||error instanceof MutationExecutionError)return json(res,400,error.toJSON());
      if(error instanceof RetrievalExecutionError)return json(res,400,{version:"v1",code:error.code,message:error.message,details:error.details,request_id:requestId});
      if(error instanceof ContextResolutionError){const status=error.code==="CONTEXT_CAPABILITY_DENIED"?403:error.code==="UNTRUSTED_CONTEXT"?401:400;return json(res,status,{version:"v1",code:error.code,message:error.message,details:error.details,request_id:requestId});}
      if(error instanceof AgentIntentError){const status=error.code==="AGENT_INTENT_CAPABILITY_DENIED"?403:error.code==="UNTRUSTED_CONTEXT"?401:400;return json(res,status,{version:"v1",code:error.code,message:error.message,request_id:requestId});}
      return json(res,500,{version:"v1",code:"INTERNAL_ERROR",message:"Graph API request failed",request_id:requestId});
    }finally{
      const statusClass=Math.floor((res.statusCode||500)/100)+"xx";
      observability.increment("vibe_http_requests_total",1,{method:req.method,route:req.url?.split("?")[0]??"",status_class:statusClass});
      if((res.statusCode||500)>=400)observability.increment("vibe_security_events_total",1,{method:req.method,route:req.url?.split("?")[0]??"",outcome:"error"});
      span.end({status:(res.statusCode||500)>=400?"error":"ok",attributes:{status_class:statusClass}});
    }
  });
  return {server,listen:()=>new Promise(resolve=>server.listen(port,host,()=>resolve(server.address()))),close:()=>new Promise(resolve=>server.close(resolve))};
}
export const DEFAULT_POOL_POLICY=Object.freeze({
  max:10,
  connectionTimeoutMillis:5000,
  idleTimeoutMillis:30000,
  statement_timeout:30000,
  query_timeout:35000,
  allowExitOnIdle:false
});

export function normalizePoolPolicy(options={}){
  const policy={...DEFAULT_POOL_POLICY,...options};
  const integer=(name,min,max)=>{
    const value=policy[name];
    if(!Number.isInteger(value)||value<min||value>max)throw new Error(`Invalid pool policy ${name}`);
  };
  integer("max",1,100);
  integer("connectionTimeoutMillis",100,60000);
  integer("idleTimeoutMillis",1000,600000);
  integer("statement_timeout",100,600000);
  integer("query_timeout",100,600000);
  if(policy.query_timeout<policy.statement_timeout)throw new Error("query_timeout must be >= statement_timeout");
  if(typeof policy.allowExitOnIdle!=="boolean")throw new Error("Invalid pool policy allowExitOnIdle");
  return policy;
}

export function createPool(connectionString,options={}){
  if(typeof connectionString!=="string"||!connectionString)throw new Error("connectionString is required");
  return new Pool({connectionString,...normalizePoolPolicy(options)});
}
