import test from "node:test";
import assert from "node:assert/strict";
import {createObservability,parseTraceparent} from "../../packages/observability/index.mjs";

test("traceparent is parsed and invalid parents are rejected",()=>{
  assert.deepEqual(parseTraceparent("00-0123456789abcdef0123456789abcdef-0123456789abcdef-01"),{
    traceId:"0123456789abcdef0123456789abcdef",spanId:"0123456789abcdef",flags:"01"
  });
  assert.equal(parseTraceparent("not-a-traceparent"),null);
});

test("observability redacts credentials, raw query data and tenant identity",()=>{
  const logs=[];
  const obs=createObservability({logSink:e=>logs.push(e)});
  obs.emitLog({
    event:"security.denied",
    tenant_id:"tenant_a",
    authorization:"redacted",
    parameters:{value:"hidden"},
    query:"raw query"
  });
  assert.equal(logs.length,1);
  assert.equal(logs[0].tenant_hash,"ea7c68e607dbd8ae");
  assert.equal(Object.hasOwn(logs[0],"authorization"),false);
  assert.equal(Object.hasOwn(logs[0],"parameters"),false);
  assert.equal(Object.hasOwn(logs[0],"query"),false);
});

test("metrics use bounded names and labels",()=>{
  const metrics=[];
  const obs=createObservability({metricSink:e=>metrics.push(e)});
  obs.increment("vibe_security_events_total",1,{error_code:"UNAUTHORIZED",tenant_id:"tenant_a"});
  assert.throws(()=>obs.increment("unapproved_metric"),/UNKNOWN_METRIC/);
  assert.equal(metrics[0].labels.tenant_id,undefined);
});

test("span duration is emitted and parent trace is preserved",()=>{
  const traces=[];
  let now=100;
  const obs=createObservability({clock:()=>now,traceSink:e=>traces.push(e)});
  const span=obs.startSpan("POST /v1/graph/query",{traceparent:"00-0123456789abcdef0123456789abcdef-0123456789abcdef-01"});
  now=145;
  assert.equal(span.end({status:"error",errorCode:"DATABASE_EXECUTION_FAILED"}),45);
  assert.equal(traces[0].trace_id,"0123456789abcdef0123456789abcdef");
  assert.equal(traces[0].duration_ms,45);
  assert.equal(traces[0].error_code,"DATABASE_EXECUTION_FAILED");
});


test("planner metric allows only bounded engine and reason labels",()=>{
  const metrics=[];
  const obs=createObservability({metricSink:event=>metrics.push(event)});
  obs.increment("vibe_query_planner_total",1,{engine:"postgresql-recursive",reason:"fallback",tenant_id:"tenant_a",query:"hidden"});
  assert.deepEqual(metrics[0].labels,{engine:"postgresql-recursive",reason:"fallback"});
});
