import test from "node:test";
import assert from "node:assert/strict";
import {handleMcpMessage} from "../../packages/mcp-server/index.mjs";

test("MCP agent.evaluate is diagnostic and uses the authenticated API boundary",async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    assert.match(url,/\/v1\/agent\/evaluate$/);
    const payload=JSON.parse(options.body);
    assert.equal(payload.cases[0].name,"case");
    return new Response(JSON.stringify({version:"v1",status:"pass"}),{status:200,headers:{"content-type":"application/json"}});
  };
  const oldUrl=process.env.VIBE_API_URL,oldToken=process.env.VIBE_MCP_ACCESS_TOKEN;
  process.env.VIBE_API_URL="https://example.test";process.env.VIBE_MCP_ACCESS_TOKEN="test-token";
  try{
    const response=await handleMcpMessage({jsonrpc:"2.0",id:1,method:"tools/call",params:{name:"agent.evaluate",arguments:{cases:[{name:"case",plan:{version:"v1",kind:"cross_modal_plan",steps:[]},expected:{status:"rejected"}}]}}});
    assert.equal(response.result.isError,undefined);
  }finally{
    globalThis.fetch=originalFetch;
    if(oldUrl===undefined)delete process.env.VIBE_API_URL;else process.env.VIBE_API_URL=oldUrl;
    if(oldToken===undefined)delete process.env.VIBE_MCP_ACCESS_TOKEN;else process.env.VIBE_MCP_ACCESS_TOKEN=oldToken;
  }
});
