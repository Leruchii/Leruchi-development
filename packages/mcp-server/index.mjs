import {validateRetrievalIR} from "../retrieval-ir/index.mjs";
import {validateContextIR} from "../context-ir/index.mjs";
import {validateAgentIntent} from "../agent-intent/index.mjs";
import readline from "node:readline";

const IR={type:"object"};
const PARAMS={type:"object",additionalProperties:true};
const PARAMETER_SETS={type:"array",items:{type:"object",additionalProperties:true},maxItems:32};
const EXECUTION={type:"object",properties:{
  mode:{type:"string",enum:["preview","execute"]},
  approval:{type:"object",properties:{
    id:{type:"string"},tenant_id:{type:"string"},digest:{type:"string"},expires_at:{type:"string"}
  },required:["id","tenant_id","digest","expires_at"],additionalProperties:false}
},additionalProperties:false};

const MAX_AGENT_ARGUMENT_BYTES=64*1024;
const MAX_AGENT_ARGUMENT_DEPTH=20;

export const MCP_TOOL_POLICIES=Object.freeze({
  "schema.discover":Object.freeze({operation:"read",readOnly:true,destructive:false,idempotent:true}),
  "graph.query":Object.freeze({operation:"read",readOnly:true,destructive:false,idempotent:true}),
  "graph.traverse":Object.freeze({operation:"read",readOnly:true,destructive:false,idempotent:true}),
  "graph.mutate":Object.freeze({operation:"write",readOnly:false,destructive:true,idempotent:false,approval:"server-enforced"}),
  "retrieval.explain":Object.freeze({operation:"diagnostic",readOnly:true,destructive:false,idempotent:true}),
  "retrieval.query":Object.freeze({operation:"read",readOnly:true,destructive:false,idempotent:true}),
  "context.explain":Object.freeze({operation:"diagnostic",readOnly:true,destructive:false,idempotent:true}),
  "context.resolve":Object.freeze({operation:"read",readOnly:true,destructive:false,idempotent:true}),
  "agent.intent.explain":Object.freeze({operation:"diagnostic",readOnly:true,destructive:false,idempotent:true}),
  "agent.plan.explain":Object.freeze({operation:"diagnostic",readOnly:true,destructive:false,idempotent:true}),
  "agent.evaluate":Object.freeze({operation:"diagnostic",readOnly:true,destructive:false,idempotent:true}),
  "agent.trace":Object.freeze({operation:"diagnostic",readOnly:true,destructive:false,idempotent:true}),
  "agent.replay":Object.freeze({operation:"diagnostic",readOnly:true,destructive:false,idempotent:true})
});

function maxDepth(value,depth=0){
  if(depth>MAX_AGENT_ARGUMENT_DEPTH)return depth;
  if(value===null||typeof value!=="object")return depth;
  const values=Array.isArray(value)?value:Object.values(value);
  let max=depth;
  for(const child of values)max=Math.max(max,maxDepth(child,depth+1));
  return max;
}

function validateAgentArguments(name,args){
  if(!Object.hasOwn(MCP_TOOL_POLICIES,name))throw new Error("Unknown tool: "+name);
  const serialized=JSON.stringify(args??{});
  if(Buffer.byteLength(serialized,"utf8")>MAX_AGENT_ARGUMENT_BYTES)throw new Error("Agent tool arguments exceed the bounded input size");
  if(maxDepth(args??{})>MAX_AGENT_ARGUMENT_DEPTH)throw new Error("Agent tool arguments exceed the bounded nesting depth");
}

export const MCP_TOOLS=[
  {name:"schema.discover",description:"Discover the authenticated tenant-scoped Leruchi Schema Catalog.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",properties:{},additionalProperties:false}},
  {name:"graph.query",description:"Execute a validated Leruchi Query IR read through the authenticated Graph API.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["ir"],properties:{ir:IR,parameters:PARAMS},additionalProperties:false}},
  {name:"graph.traverse",description:"Execute a bounded structured graph traversal expressed as Query IR. No free-form Cypher.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["ir"],properties:{ir:IR,parameters:PARAMS},additionalProperties:false}},
  {name:"graph.mutate",description:"Execute a validated Leruchi Mutation IR write. Destructive operations require an explicit approval artifact; use preview mode to inspect impact without executing.",annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:false,openWorldHint:false},inputSchema:{type:"object",required:["ir"],properties:{ir:IR,parameters:PARAMS,execution:EXECUTION},additionalProperties:false}},
  {name:"retrieval.explain",description:"Explain a bounded retrieval request without executing it or granting authorization.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["ir"],properties:{ir:IR},additionalProperties:false}},
  {name:"retrieval.query",description:"Execute bounded GraphRAG Retrieval IR through the authenticated Leruchi retrieval boundary. Tenant identity is derived from the access token.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["ir"],properties:{ir:IR,parameters:PARAMS},additionalProperties:false}},
  {name:"context.explain",description:"Validate and explain an agent Context IR request without executing it. Tenant identity is derived from the authenticated access token.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["ir"],properties:{ir:IR},additionalProperties:false}},
  {name:"context.resolve",description:"Resolve bounded Context IR through the authenticated Leruchi secure execution path. Tenant identity and capabilities remain server-authoritative.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["ir"],properties:{ir:IR,parameters:PARAMETER_SETS},additionalProperties:false}},
  {name:"agent.intent.explain",description:"Validate and explain a structured Agent Intent without executing it. The intent must target a canonical Leruchi IR; authorization remains server-authoritative.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["intent"],properties:{intent:IR},additionalProperties:false}},
  {name:"agent.plan.explain",description:"Validate and explain a cross-modal plan without executing it. It may compose canonical Query, Retrieval, Context and Mutation IR steps.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["plan"],properties:{plan:IR},additionalProperties:false}},
  {name:"agent.evaluate",description:"Run bounded, non-executing evaluation cases for Agent Intents or cross-modal plans. Returns pass/fail metadata and hashes, never raw target IR.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["cases"],properties:{cases:{type:"array",maxItems:64,items:{type:"object"}}},additionalProperties:false}},
  {name:"agent.trace",description:"Create a bounded sanitized Agent Trace without executing the traced artifact. Sensitive identity, credentials and engine fragments are removed.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["artifact_kind","artifact","expected"],properties:{artifact_kind:{type:"string",enum:["agent_intent","cross_modal_plan"]},artifact:IR,expected:{type:"object"},outcome:{type:"object"},case_name:{type:"string"}},additionalProperties:false}},
  {name:"agent.replay",description:"Replay a validated Agent Trace through the existing explanation boundary without executing SQL, Cypher or mutations.",annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:"object",required:["trace"],properties:{trace:IR},additionalProperties:false}}
];

function result(data){return {content:[{type:"text",text:JSON.stringify(data)}]};}
function error(message){return {isError:true,content:[{type:"text",text:message}]};}

async function api(path,options={},tool=null){
  const apiBase=(process.env.VIBE_API_URL??"").replace(/\/$/,"");
  const accessToken=(process.env.LERUCHI_MCP_ACCESS_TOKEN ?? process.env.VIBE_MCP_ACCESS_TOKEN)??"";
  if(!apiBase||!accessToken)throw new Error("VIBE_API_URL and VIBE_MCP_ACCESS_TOKEN are required");
  const headers={authorization:"Bearer "+accessToken,"content-type":"application/json",...(tool?{"x-vibe-mcp-tool":tool}:{}),...(options.headers??{})};
  const response=await fetch(apiBase+path,{...options,headers});
  const body=await response.json().catch(()=>({error:{code:"INVALID_UPSTREAM_RESPONSE",message:"Invalid Leruchi response"}}));
  if(!response.ok)throw new Error(body?.error?.message??body?.message??"Leruchi request failed");
  return body;
}

export async function handleMcpMessage(message){
  const id=message.id??null;
  try{
    if(message.jsonrpc!=="2.0")throw new Error("JSON-RPC 2.0 is required");
    if(message.method==="initialize")return {jsonrpc:"2.0",id,result:{protocolVersion:"2025-06-18",capabilities:{tools:{}},serverInfo:{name:"leruchi-mcp",version:"0.1.0"}}};
    if(message.method==="notifications/initialized")return null;
    if(message.method==="tools/list")return {jsonrpc:"2.0",id,result:{tools:MCP_TOOLS}};
    if(message.method!=="tools/call")return {jsonrpc:"2.0",id,error:{code:-32601,message:"Method not found"}};
    const name=message.params?.name;
    const args=message.params?.arguments??{};
    validateAgentArguments(name,args);
    if(Object.hasOwn(args,"tenant_id")||Object.hasOwn(args,"tenantId"))throw new Error("Tenant identity is derived from the authenticated access token and cannot be supplied as tool input");
    let data;
    if(name==="schema.discover")data=await api("/v1/schema/catalog",{},name);
    else if(name==="graph.query"||name==="graph.traverse")data=await api("/v1/graph/query",{method:"POST",body:JSON.stringify({ir:args.ir,parameters:args.parameters??{}})},name);
    else if(name==="graph.mutate")data=await api("/v1/graph/mutations",{method:"POST",body:JSON.stringify({ir:args.ir,parameters:args.parameters??{},execution:args.execution??{}})},name);
    else if(name==="retrieval.explain"){ validateRetrievalIR(args.ir); data=await api("/v1/retrieval/explain",{method:"POST",body:JSON.stringify({ir:args.ir})},name); }
    else if(name==="retrieval.query"){ validateRetrievalIR(args.ir); data=await api("/v1/retrieval/query",{method:"POST",body:JSON.stringify({ir:args.ir,parameters:args.parameters??{}})},name); }
    else if(name==="context.explain"){ validateContextIR(args.ir); data=await api("/v1/context/explain",{method:"POST",body:JSON.stringify({ir:args.ir})},name); }
    else if(name==="context.resolve"){ validateContextIR(args.ir); data=await api("/v1/context/resolve",{method:"POST",body:JSON.stringify({ir:args.ir,parameters:args.parameters??[]})},name); }
    else if(name==="agent.intent.explain"){ validateAgentIntent(args.intent); data=await api("/v1/agent/intent/explain",{method:"POST",body:JSON.stringify({intent:args.intent})},name); }
    else if(name==="agent.plan.explain"){ data=await api("/v1/agent/plan/explain",{method:"POST",body:JSON.stringify({plan:args.plan})},name); }
    else if(name==="agent.evaluate"){ data=await api("/v1/agent/evaluate",{method:"POST",body:JSON.stringify({cases:args.cases})},name); }
    else if(name==="agent.trace"){ data=await api("/v1/agent/trace",{method:"POST",body:JSON.stringify(args)},name); }
    else if(name==="agent.replay"){ data=await api("/v1/agent/replay",{method:"POST",body:JSON.stringify({trace:args.trace})},name); }
    else return {jsonrpc:"2.0",id,result:error("Unknown tool: "+name)};
    return {jsonrpc:"2.0",id,result:result(data)};
  }catch(e){return {jsonrpc:"2.0",id,result:error(e instanceof Error?e.message:"MCP tool failed")};}
}

if(import.meta.url===new URL(process.argv[1],"file:").href){
  const rl=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
  for await(const line of rl){if(!line.trim())continue;const response=await handleMcpMessage(JSON.parse(line));if(response)process.stdout.write(JSON.stringify(response)+"\n");}
}
