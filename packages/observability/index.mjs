import {createHash,randomUUID} from "node:crypto";

const SECRET_KEYS=/authorization|cookie|token|secret|password|api[_-]?key|private[_-]?key|credential|embedding|query|sql|cypher|parameters?/i;
const TENANT_KEYS=/^tenant(?:_id|Id)?$/i;
const ALLOWED_METRICS=new Set([
  "vibe_http_requests_total",
  "vibe_http_request_duration_ms",
  "vibe_query_duration_ms",
  "vibe_query_db_duration_ms",
  "vibe_mutation_duration_ms",
  "vibe_mutation_db_duration_ms",
  "vibe_retrieval_duration_ms",
  "vibe_security_events_total"
]);
const BUCKETS=[5,10,25,50,100,250,500,1000,2500,5000];

function hashTenant(value){
  if(typeof value!=="string"||!value)return null;
  return createHash("sha256").update(value).digest("hex").slice(0,16);
}
function sanitize(value,depth=0){
  if(depth>4)return "[truncated]";
  if(value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean")return value;
  if(Array.isArray(value))return value.slice(0,20).map(v=>sanitize(v,depth+1));
  if(typeof value!=="object")return "[redacted]";
  const out={};
  for(const [key,child] of Object.entries(value)){
    if(SECRET_KEYS.test(key))continue;
    if(TENANT_KEYS.test(key)){out.tenant_hash=hashTenant(child);continue;}
    out[key]=sanitize(child,depth+1);
  }
  return out;
}
function metricName(name){
  if(!ALLOWED_METRICS.has(name))throw new Error("UNKNOWN_METRIC");
  return name;
}
function fixedLabels(labels={}){
  const allowed=["method","route","operation","outcome","error_code","status_class","source"];
  const out={};
  for(const key of allowed){
    if(typeof labels[key]==="string"&&labels[key].length<=80)out[key]=labels[key];
  }
  return out;
}

export function createTraceContext(parent){
  const traceId=typeof parent?.traceId==="string"&&/^[0-9a-f]{32}$/.test(parent.traceId)?parent.traceId:randomUUID().replaceAll("-","");
  const parentSpanId=typeof parent?.spanId==="string"&&/^[0-9a-f]{16}$/.test(parent.spanId)?parent.spanId:null;
  return Object.freeze({traceId,spanId:randomUUID().replaceAll("-","").slice(0,16),parentSpanId});
}
export function parseTraceparent(value){
  if(typeof value!=="string")return null;
  const m=/^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i.exec(value.trim());
  return m?{traceId:m[1].toLowerCase(),spanId:m[2].toLowerCase(),flags:m[3].toLowerCase()}:null;
}

export function createObservability({logSink=()=>{},metricSink=()=>{},traceSink=()=>{},clock=()=>Date.now()}={}){
  const metrics=new Map();
  const emitLog=event=>{try{logSink(Object.freeze({version:"v1",timestamp:new Date(clock()).toISOString(),...sanitize(event)}));}catch{}};
  const increment=(name,value=1,labels={})=>{
    metricName(name);
    const amount=Number.isFinite(value)?value:0;
    const key=JSON.stringify([name,fixedLabels(labels)]);
    metrics.set(key,(metrics.get(key)??0)+amount);
    try{metricSink(Object.freeze({version:"v1",name,value:amount,labels:fixedLabels(labels)}));}catch{}
  };
  const observe=(name,value,labels={})=>{
    metricName(name);
    const amount=Math.max(0,Number(value)||0);
    increment(name,amount,labels);
    try{
      const bucket=BUCKETS.find(v=>amount<=v)??"+Inf";
      metricSink(Object.freeze({version:"v1",name,kind:"histogram",value:amount,bucket,labels:fixedLabels(labels)}));
    }catch{}
  };
  const startSpan=(name,{traceparent,attributes={}}={})=>{
    const parent=parseTraceparent(traceparent);
    const context=createTraceContext(parent);
    const started=clock();
    let ended=false;
    emitLog({event:"span.start",span:name,trace_id:context.traceId,span_id:context.spanId,attributes});
    return Object.freeze({
      context,
      end({status="ok",errorCode=null,attributes:finalAttributes={}}={}){
        if(ended)return;
        ended=true;
        const duration=Math.max(0,clock()-started);
        const event={event:"span.end",span:name,trace_id:context.traceId,span_id:context.spanId,parent_span_id:context.parentSpanId,status,error_code:errorCode,duration_ms:duration,attributes:{...attributes,...finalAttributes}};
        emitLog(event);
        try{traceSink(Object.freeze(sanitize(event)));}catch{}
        observe("vibe_http_request_duration_ms",duration,{route:name,outcome:status});
        return duration;
      }
    });
  };
  const snapshot=()=>Object.freeze(Object.fromEntries([...metrics].map(([key,value])=>[key,value])));
  return Object.freeze({emitLog,increment,observe,startSpan,snapshot,sanitize});
}
export {sanitize};
