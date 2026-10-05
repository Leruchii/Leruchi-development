import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {createPool} from "../../packages/graph-api/index.mjs";

const connectionString=process.env.DATABASE_URL;
if(!connectionString)throw new Error("DATABASE_URL is required");

const concurrency=32;
const poolMax=4;
const pool=createPool(connectionString,{
  max:poolMax,
  connectionTimeoutMillis:5000,
  statement_timeout:5000,
  query_timeout:6000
});

const started=performance.now();
try{
  const tasks=Array.from({length:concurrency},(_,index)=>
    pool.query("SELECT pg_sleep(0.02), $1::int AS probe",[index])
  );
  const results=await Promise.all(tasks);
  assert.equal(results.length,concurrency);
  results.forEach((result,index)=>assert.equal(result.rows[0].probe,index));
  assert.ok(pool.totalCount<=poolMax,`pool opened ${pool.totalCount} connections, expected <= ${poolMax}`);
  const elapsedMs=Math.round(performance.now()-started);
  process.stdout.write(JSON.stringify({
    version:"v1",
    status:"passed",
    concurrent_requests:concurrency,
    pool_max:poolMax,
    peak_connections:pool.totalCount,
    elapsed_ms:elapsedMs,
    evidence:"bounded-pool-queues-concurrent-database-work"
  })+"\n");
}finally{
  await pool.end();
}
