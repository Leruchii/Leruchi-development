import test from "node:test";
import assert from "node:assert/strict";
import {createGraphApiServer} from "../../packages/graph-api/index.mjs";

function fakePool(){
  return {connect:async()=>({query:async()=>({rows:[]}),release(){}})};
}
test("Graph API rejects missing bearer credentials",async()=>{
  const api=createGraphApiServer({pool:fakePool(),jwtSecret:"secret",catalogProvider:async()=>({graphs:{}}),port:0});
  const address=await api.listen();
  try{
    const res=await fetch(`http://127.0.0.1:${address.port}/v1/graph/query`,{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
    assert.equal(res.status,401);
    const body=await res.json();
    assert.equal(body.code,"UNAUTHORIZED");
  }finally{await api.close();}
});
test("Graph API health is public and versioned",async()=>{
  const api=createGraphApiServer({pool:fakePool(),jwtSecret:"secret",catalogProvider:async()=>({graphs:{}}),port:0});
  const address=await api.listen();
  try{
    const res=await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(res.status,200);
    assert.deepEqual(await res.json(),{version:"v1",status:"ok"});
  }finally{await api.close();}
});
