import test from "node:test";
import assert from "node:assert/strict";
import {compileVectorRetrieval,executeVectorRetrieval,resolveVectorCatalog} from "../../packages/vector-execution/index.mjs";

const catalog={vectors:{
  "docs.embedding":{
    schemaName:"vibe_app",relationName:"documents",embeddingColumn:"embedding",
    keyColumn:"id",contentColumn:"content",dimensions:3,distanceMetric:"cosine"
  }
}};

const context={trusted:true,tenantId:"tenant_a",role:"authenticated",capabilities:["graph:read","vector:read"],requestId:"r1"};

test("resolves only Schema Catalog vector sources",()=>{
  const source=resolveVectorCatalog(catalog,"docs.embedding");
  assert.equal(source.schemaName,'"vibe_app"');
  assert.equal(source.relationName,'"documents"');
  assert.equal(source.operator,"<=>");
  assert.throws(()=>resolveVectorCatalog(catalog,"unknown.embedding"),/not visible/);
  assert.throws(()=>resolveVectorCatalog(catalog,"documents;DROP"),/Invalid vector catalog/);
});

test("compiles parameterized pgvector retrieval with catalog-trusted identifiers",()=>{
  const compiled=compileVectorRetrieval({catalog,catalogRef:"docs.embedding",embedding:[1,0,0],topK:5,maxResults:20,maxCost:20});
  assert.match(compiled.sql,/FROM "vibe_app"\."documents"/);
  assert.match(compiled.sql,/"embedding" <=> \$1::vector/);
  assert.deepEqual(compiled.values,["[1,0,0]",5]);
  assert.deepEqual(compiled.columns,["id","content","distance"]);
});

test("fails closed on vector dimension and budget violations",()=>{
  assert.throws(()=>compileVectorRetrieval({catalog,catalogRef:"docs.embedding",embedding:[1,0],topK:5,maxResults:20,maxCost:20}),/dimensions/);
  assert.throws(()=>compileVectorRetrieval({catalog,catalogRef:"docs.embedding",embedding:[1,0,0],topK:21,maxResults:20,maxCost:20}),/budget/);
});

test("requires the canonical vector read capability",async()=>{
  const db={begin:async()=>{throw new Error("should not execute")}};
  await assert.rejects(()=>executeVectorRetrieval({catalog,catalogRef:"docs.embedding",embedding:[1,0,0],topK:1,maxResults:20,maxCost:20,context:{...context,capabilities:["graph:read"]},db}),/vector:read capability/);
});

test("executes inside the existing trusted transaction boundary",async()=>{
  const calls=[];
  const db={
    async begin(){calls.push("begin")},
    async executeBound(compiled){calls.push(compiled);return {rows:[{id:"a",distance:0.1}]}},
    async commit(){calls.push("commit")},
    async rollback(){calls.push("rollback")}
  };
  const result=await executeVectorRetrieval({catalog,catalogRef:"docs.embedding",embedding:[1,0,0],topK:1,maxResults:20,maxCost:20,context,db});
  assert.equal(result.count,1);
  assert.deepEqual(calls.map(x=>typeof x==="string"?x:"execute"),["begin","execute","commit"]);
});
