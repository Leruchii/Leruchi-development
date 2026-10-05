import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_POOL_POLICY,normalizePoolPolicy,createPool} from "../../packages/graph-api/index.mjs";

test("Graph API pool defaults are explicit and bounded",async()=>{
  assert.deepEqual(DEFAULT_POOL_POLICY,{
    max:10,
    connectionTimeoutMillis:5000,
    idleTimeoutMillis:30000,
    statement_timeout:30000,
    query_timeout:35000,
    allowExitOnIdle:false
  });
  const pool=createPool("postgresql://example.invalid/vibedb",{max:4});
  try{
    assert.equal(pool.options.max,4);
    assert.equal(pool.options.connectionTimeoutMillis,5000);
    assert.equal(pool.options.idleTimeoutMillis,30000);
    assert.equal(pool.options.statement_timeout,30000);
    assert.equal(pool.options.query_timeout,35000);
  }finally{await pool.end();}
});

test("Graph API pool policy rejects unbounded or contradictory options",()=>{
  assert.throws(()=>normalizePoolPolicy({max:0}),/Invalid pool policy max/);
  assert.throws(()=>normalizePoolPolicy({max:101}),/Invalid pool policy max/);
  assert.throws(()=>normalizePoolPolicy({connectionTimeoutMillis:0}),/connectionTimeoutMillis/);
  assert.throws(()=>normalizePoolPolicy({statement_timeout:40000,query_timeout:30000}),/query_timeout/);
});
