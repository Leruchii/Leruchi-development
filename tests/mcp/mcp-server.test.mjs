import test from "node:test";
import assert from "node:assert/strict";
import {handleMcpMessage,MCP_TOOLS} from "../../packages/mcp-server/index.mjs";

test("MCP advertises the canonical agent-native graph tools",async()=>{
  const response=await handleMcpMessage({jsonrpc:"2.0",id:1,method:"tools/list"});
  assert.deepEqual(response.result.tools.map(tool=>tool.name),["schema.discover","graph.query","graph.traverse","graph.mutate","retrieval.explain","retrieval.query","context.explain","context.resolve","agent.intent.explain"]);
});

test("MCP initialize exposes a protocol-compatible tool server",async()=>{
  const response=await handleMcpMessage({jsonrpc:"2.0",id:2,method:"initialize",params:{protocolVersion:"2025-06-18"}});
  assert.equal(response.result.serverInfo.name,"vibedb-mcp");
  assert.deepEqual(response.result.capabilities,{tools:{}});
});

test("MCP rejects unknown tools without touching the data plane",async()=>{
  const response=await handleMcpMessage({jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"sql.query",arguments:{sql:"select 1"}}});
  assert.equal(response.result.isError,true);
  assert.match(response.result.content[0].text,/Unknown tool/);
});

test("MCP rejects tenant identity supplied by an agent",async()=>{
  const response=await handleMcpMessage({jsonrpc:"2.0",id:4,method:"tools/call",params:{name:"graph.query",arguments:{tenant_id:"attacker_tenant",ir:{version:"v1"}}}});
  assert.equal(response.result.isError,true);
  assert.match(response.result.content[0].text,/Tenant identity is derived/);
});

test("MCP tool schemas reject undeclared input fields",()=>{
  for(const tool of MCP_TOOLS){
    assert.equal(tool.inputSchema.additionalProperties,false,tool.name);
  }
});

test("MCP graph.mutate exposes preview and scoped approval controls",()=>{
  const tool=MCP_TOOLS.find(tool=>tool.name==="graph.mutate");
  assert.deepEqual(tool.inputSchema.properties.execution.properties.mode.enum,["preview","execute"]);
  assert.equal(tool.inputSchema.properties.execution.properties.approval.additionalProperties,false);
});

test("MCP retrieval schema is closed and tenant identity is not an input",()=>{
  const tool=MCP_TOOLS.find(tool=>tool.name==="retrieval.query");
  assert.ok(tool);
  assert.equal(tool.inputSchema.additionalProperties,false);
  assert.equal(tool.inputSchema.required.includes("ir"),true);
});


test("MCP validates retrieval IR before transport",async()=>{
  const response=await handleMcpMessage({jsonrpc:"2.0",id:5,method:"tools/call",params:{
    name:"retrieval.query",
    arguments:{ir:{version:"v1",kind:"retrieval_query",sources:{vector:{catalog_ref:"docs;DROP",query_parameter:"embedding",identity_field:"id",top_k:5}},fusion:{strategy:"weighted_rrf"},limits:{max_results:5,max_cost:20}}}
  }});
  assert.equal(response.result.isError,true);
  assert.match(response.result.content[0].text,/safe catalog reference/);
});

test("MCP retrieval rejects tenant overrides inside graph Query IR",async()=>{
  const response=await handleMcpMessage({jsonrpc:"2.0",id:6,method:"tools/call",params:{
    name:"retrieval.query",
    arguments:{ir:{version:"v1",kind:"retrieval_query",sources:{graph:{query:{version:"v1",kind:"graph_query",tenant_id:"attacker"},identity_field:"id"}},fusion:{strategy:"weighted_rrf"},limits:{max_results:5,max_cost:20}}}
  }});
  assert.equal(response.result.isError,true);
  assert.match(response.result.content[0].text,/tenant override|tenant identity/i);
});


test("MCP retrieval explanation is non-executing and closed",()=>{
  const tool=MCP_TOOLS.find(tool=>tool.name==="retrieval.explain");
  assert.ok(tool);
  assert.equal(tool.inputSchema.additionalProperties,false);
  assert.deepEqual(tool.inputSchema.required,["ir"]);
  assert.equal(Object.hasOwn(tool.inputSchema.properties,"parameters"),false);
});


test("MCP publishes deterministic safety annotations for every agent tool",()=>{
  for(const tool of MCP_TOOLS){
    assert.equal(typeof tool.annotations,"object",tool.name);
    assert.equal(typeof tool.annotations.readOnlyHint,"boolean",tool.name);
    assert.equal(typeof tool.annotations.destructiveHint,"boolean",tool.name);
    assert.equal(typeof tool.annotations.idempotentHint,"boolean",tool.name);
    assert.equal(tool.annotations.openWorldHint,false,tool.name);
  }
  const mutate=MCP_TOOLS.find(tool=>tool.name==="graph.mutate");
  assert.equal(mutate.annotations.destructiveHint,true);
  assert.equal(mutate.annotations.readOnlyHint,false);
});

test("MCP rejects oversized agent arguments before the data plane",async()=>{
  const response=await handleMcpMessage({jsonrpc:"2.0",id:7,method:"tools/call",params:{name:"graph.query",arguments:{ir:{version:"v1"},padding:"x".repeat(70*1024)}}});
  assert.equal(response.result.isError,true);
  assert.match(response.result.content[0].text,/bounded input size/);
});

test("MCP rejects excessively nested agent arguments before the data plane",async()=>{
  let nested={value:"ok"};
  for(let i=0;i<25;i++)nested={value:nested};
  const response=await handleMcpMessage({jsonrpc:"2.0",id:8,method:"tools/call",params:{name:"graph.query",arguments:{ir:nested}}});
  assert.equal(response.result.isError,true);
  assert.match(response.result.content[0].text,/bounded nesting depth/);
});

test("MCP context.explain is diagnostic and validates Context IR before transport", async () => {
  const contextTool = MCP_TOOLS.find((tool) => tool.name === "context.explain");
  assert.equal(contextTool?.annotations.readOnlyHint, true);
  assert.equal(contextTool?.annotations.destructiveHint, false);
  assert.deepEqual(Object.keys(contextTool.inputSchema.properties), ["ir"]);
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls += 1; return new Response(JSON.stringify({ ok: true }), { status: 200 }); };
  try {
    const response = await handleMcpMessage({
      jsonrpc: "2.0", id: "context-invalid", method: "tools/call",
      params: { name: "context.explain", arguments: { ir: { version: "v1", kind: "context_request", tenant_id: "other" } } }
    });
    assert.equal(response.result.isError, true);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP context.resolve is read-only and validates Context IR before transport",async()=>{
  const tool=MCP_TOOLS.find(tool=>tool.name==="context.resolve");
  assert.ok(tool);
  assert.equal(tool.annotations.readOnlyHint,true);
  assert.equal(tool.annotations.destructiveHint,false);
  assert.deepEqual(Object.keys(tool.inputSchema.properties),["ir","parameters"]);
  let calls=0;
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({ok:true}),{status:200});};
  try{
    const response=await handleMcpMessage({jsonrpc:"2.0",id:"context-resolve-invalid",method:"tools/call",params:{name:"context.resolve",arguments:{ir:{version:"v1",kind:"context_request"}}}});
    assert.equal(response.result.isError,true);
    assert.equal(calls,0);
  }finally{globalThis.fetch=originalFetch;}
});

test("MCP agent.intent.explain is diagnostic and rejects malformed intent before transport",async()=>{
  const tool=MCP_TOOLS.find(tool=>tool.name==="agent.intent.explain");
  assert.ok(tool);
  assert.equal(tool.annotations.readOnlyHint,true);
  assert.equal(tool.annotations.destructiveHint,false);
  assert.deepEqual(Object.keys(tool.inputSchema.properties),["intent"]);
  let calls=0;
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({status:"ready"}),{status:200});};
  try{
    const response=await handleMcpMessage({jsonrpc:"2.0",id:"bad-intent",method:"tools/call",params:{name:"agent.intent.explain",arguments:{intent:{version:"v1",kind:"agent_intent",action:"query",ir:{kind:"retrieval_query"}}}}});
    assert.equal(response.result.isError,true);
    assert.equal(calls,0);
  }finally{globalThis.fetch=originalFetch;}
});
