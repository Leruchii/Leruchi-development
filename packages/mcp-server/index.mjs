import readline from "node:readline";

export const MCP_TOOLS=[
  {name:"schema.discover",description:"Discover the authenticated tenant-scoped VibeDB Schema Catalog.",inputSchema:{type:"object",properties:{},additionalProperties:false}},
  {name:"graph.query",description:"Execute a validated VibeDB Query IR read through the authenticated Graph API.",inputSchema:{type:"object",required:["ir"],properties:{ir:{type:"object"},parameters:{type:"object"}},additionalProperties:false}},
  {name:"graph.traverse",description:"Execute a bounded structured graph traversal expressed as Query IR. No free-form Cypher.",inputSchema:{type:"object",required:["ir"],properties:{ir:{type:"object"},parameters:{type:"object"}},additionalProperties:false}},
  {name:"graph.mutate",description:"Execute a validated VibeDB Mutation IR write through the authenticated Graph API.",inputSchema:{type:"object",required:["ir"],properties:{ir:{type:"object"},parameters:{type:"object"}},additionalProperties:false}}
];

function result(data){return {content:[{type:"text",text:JSON.stringify(data)}]};}
function error(message){return {isError:true,content:[{type:"text",text:message}]};}

async function api(path,options={}){
  const apiBase=(process.env.VIBE_API_URL??"").replace(/\/$/,"");
  const accessToken=process.env.VIBE_MCP_ACCESS_TOKEN??"";
  if(!apiBase||!accessToken)throw new Error("VIBE_API_URL and VIBE_MCP_ACCESS_TOKEN are required");
  const response=await fetch(apiBase+path,{...options,headers:{authorization:"Bearer "+accessToken,"content-type":"application/json",...(options.headers??{})}});
  const body=await response.json().catch(()=>({error:{code:"INVALID_UPSTREAM_RESPONSE",message:"Invalid VibeDB response"}}));
  if(!response.ok)throw new Error(body?.error?.message??body?.message??"VibeDB request failed");
  return body;
}

export async function handleMcpMessage(message){
  const id=message.id??null;
  try{
    if(message.jsonrpc!=="2.0")throw new Error("JSON-RPC 2.0 is required");
    if(message.method==="initialize"){
      return {jsonrpc:"2.0",id,result:{protocolVersion:"2025-06-18",capabilities:{tools:{}},serverInfo:{name:"vibedb-mcp",version:"0.1.0"}}};
    }
    if(message.method==="notifications/initialized")return null;
    if(message.method==="tools/list")return {jsonrpc:"2.0",id,result:{tools:MCP_TOOLS}};
    if(message.method!=="tools/call")return {jsonrpc:"2.0",id,error:{code:-32601,message:"Method not found"}};
    const name=message.params?.name;
    const args=message.params?.arguments??{};
    if(Object.hasOwn(args,"tenant_id")||Object.hasOwn(args,"tenantId"))throw new Error("Tenant identity is derived from the authenticated access token and cannot be supplied as tool input");
    let data;
    if(name==="schema.discover")data=await api("/v1/schema/catalog");
    else if(name==="graph.query"||name==="graph.traverse")data=await api("/v1/graph/query",{method:"POST",body:JSON.stringify({ir:args.ir,parameters:args.parameters??{}})});
    else if(name==="graph.mutate")data=await api("/v1/graph/mutations",{method:"POST",body:JSON.stringify({ir:args.ir,parameters:args.parameters??{}})});
    else return {jsonrpc:"2.0",id,result:error("Unknown tool: "+name)};
    return {jsonrpc:"2.0",id,result:result(data)};
  }catch(e){
    return {jsonrpc:"2.0",id,result:error(e instanceof Error?e.message:"MCP tool failed")};
  }
}

if(import.meta.url===new URL(process.argv[1],"file:").href){
  const rl=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
  for await(const line of rl){
    if(!line.trim())continue;
    const response=await handleMcpMessage(JSON.parse(line));
    if(response)process.stdout.write(JSON.stringify(response)+"\n");
  }
}
