import test from "node:test";
import assert from "node:assert/strict";
import {handleMcpMessage,MCP_TOOLS} from "../../packages/mcp-server/index.mjs";

test("MCP advertises the canonical agent-native graph tools",async()=>{
  const response=await handleMcpMessage({jsonrpc:"2.0",id:1,method:"tools/list"});
  assert.deepEqual(response.result.tools.map(tool=>tool.name),["schema.discover","graph.query","graph.traverse","graph.mutate"]);
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
