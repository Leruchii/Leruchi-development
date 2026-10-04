import test from "node:test";
import assert from "node:assert/strict";
import {Client} from "pg";
import {createPgMutationExecutor} from "../../packages/mutation-execution/index.mjs";
import {claimBatch,markPublished,markFailed,replayTenantGraph,toClientEvent} from "../../packages/realtime-outbox/index.mjs";

const runtimeUrl=process.env.VIBE_RUNTIME_DATABASE_URL??"postgresql://vibe_runtime:runtime@127.0.0.1:5432/vibedb";
const relayUrl=process.env.VIBE_REALTIME_DATABASE_URL??"postgresql://vibe_realtime:realtime@127.0.0.1:5432/vibedb";

async function insertEvent(tenantId,event){
  const client=new Client({connectionString:runtimeUrl});await client.connect();
  const db=createPgMutationExecutor(client,{tenantId,role:"authenticated"});
  await db.begin();
  await db.insertOutbox(event);
  await db.commit();
  await client.end();
}

test("tenant-scoped outbox and relay lifecycle",{timeout:20000},async()=>{
  let relay;
  let a;
  let rollbackClient;
  try {
  const event={
    eventId:"stage12-"+Date.now(),
    requestId:"request-stage12",
    tenantId:"tenant_a",
    graph:"vibe_stage01",
    operation:"update_vertex",
    targetKind:"vertex",
    targetLabel:"Person",
    targetId:"42"
  };
  relay=new Client({connectionString:relayUrl});await relay.connect();
  await relay.query("LISTEN vibe_graph_events");
  const notification=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("realtime wakeup notification timed out")),5000);
    relay.on("notification",message=>{
      if(message.channel==="vibe_graph_events"&&message.payload===event.eventId){clearTimeout(timer);resolve(message.payload);}
    });
  });
  await insertEvent("tenant_a",event);
  assert.equal(await notification,event.eventId);

  const rolledBack={...event,eventId:event.eventId+"-rollback",requestId:"request-stage12-rollback"};
  rollbackClient=new Client({connectionString:runtimeUrl});await rollbackClient.connect();
  const rollbackDb=createPgMutationExecutor(rollbackClient,{tenantId:"tenant_a",role:"authenticated"});
  await rollbackDb.begin();
  await rollbackDb.insertOutbox(rolledBack);
  await rollbackDb.rollback();
  await rollbackClient.end();

  a=new Client({connectionString:runtimeUrl});await a.connect();
  await a.query("SELECT set_config($1,$2,false)",["request.jwt.claims",JSON.stringify({tenant_id:"tenant_a"})]);
  const own=await a.query("SELECT event_id,tenant_id,graph_name,target_id FROM vibe_meta.graph_event_outbox WHERE event_id=$1",[event.eventId]);
  assert.equal(own.rowCount,1);
  assert.equal(own.rows[0].tenant_id,"tenant_a");
  const rolled=await a.query("SELECT event_id FROM vibe_meta.graph_event_outbox WHERE event_id=$1",[rolledBack.eventId]);
  assert.equal(rolled.rowCount,0);
  await a.query("SELECT set_config($1,$2,false)",["request.jwt.claims",JSON.stringify({tenant_id:"tenant_b"})]);
  const denied=await a.query("SELECT event_id FROM vibe_meta.graph_event_outbox WHERE event_id=$1",[event.eventId]);
  assert.equal(denied.rowCount,0);
  await a.end();

  const batch=await claimBatch(relay,{workerId:"stage12-worker",limit:10});
  const claimed=batch.find(row=>row.event_id===event.eventId);
  assert.ok(claimed);
  const replay=await replayTenantGraph(relay,{tenantId:"tenant_a",graph:"vibe_stage01",afterEventSeq:Number(claimed.event_seq)-1,relayContext:{trusted:true,role:"realtime_relay"}});
  assert.equal(replay.length,1);
  assert.equal(replay[0].event_id,event.eventId);
  assert.equal("tenant_id" in replay[0],false);
  assert.equal(await markPublished(relay,{eventSeq:claimed.event_seq,workerId:"stage12-worker"}),true);
  assert.equal(await markPublished(relay,{eventSeq:claimed.event_seq,workerId:"stage12-worker"}),false);

  const failedEvent={...event,eventId:event.eventId+"-retry",requestId:"request-stage12-retry"};
  await insertEvent("tenant_a",failedEvent);
  const failedBatch=await claimBatch(relay,{workerId:"stage12-worker",limit:10});
  const retry=failedBatch.find(row=>row.event_id===failedEvent.eventId);
  assert.ok(retry);
  assert.equal(await markFailed(relay,{eventSeq:retry.event_seq,workerId:"stage12-worker",error:new Error("temporary")}),true);
  await relay.end();
  relay=null;
  } finally {
    for (const client of [rollbackClient,a,relay]) {
      if (client) { try { await client.end(); } catch {} }
    }
  }
});

if(process.env.RUN_STAGE12_INTEGRATION!=="1") {
  test("stage 12 integration mode",t=>t.skip("integration mode disabled"));
}
