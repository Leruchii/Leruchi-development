import test from "node:test";
import assert from "node:assert/strict";
import {createGraphApiServer} from "../../packages/graph-api/index.mjs";
import {createObservability} from "../../packages/observability/index.mjs";

function fakePool(){return {connect:async()=>({query:async()=>({rows:[]}),release(){}})};}

test("Graph API emits bounded request telemetry without tenant or credential fields",async()=>{
  const logs=[];const metrics=[];const traces=[];
  const observability=createObservability({logSink:e=>logs.push(e),metricSink:e=>metrics.push(e),traceSink:e=>traces.push(e)});
  const api=createGraphApiServer({pool:fakePool(),jwtSecret:"secret",catalogProvider:async()=>({graphs:{}}),observability,port:0});
  const address=await api.listen();
  try{
    const response=await fetch(`http://127.0.0.1:${address.port}/v1/graph/query`,{method:"POST",headers:{authorization:"Bearer invalid"}});
    assert.equal(response.status,401);
    assert.ok(response.headers.get("x-vibe-request-id"));
    assert.ok(response.headers.get("x-vibe-trace-id"));
    assert.ok(logs.some(e=>e.event==="span.end"&&e.status==="error"));
    assert.ok(metrics.some(e=>e.name==="vibe_http_requests_total"));
    assert.ok(metrics.some(e=>e.name==="vibe_security_events_total"));
    assert.ok(traces.some(e=>e.duration_ms>=0));
    for(const event of [...logs,...traces]){
      assert.equal(Object.hasOwn(event,"authorization"),false);
      assert.equal(Object.hasOwn(event,"tenant_id"),false);
    }
  }finally{await api.close();}
});
