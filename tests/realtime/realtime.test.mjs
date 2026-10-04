import test from "node:test";
import assert from "node:assert/strict";
import {authorizeSubscription,topicFor,toClientEvent,replayTenantGraph} from "../../packages/realtime-outbox/index.mjs";

const catalog={graphs:{
  shared:{visibility:"shared",tenantId:null},
  private_a:{visibility:"tenant",tenantId:"tenant_a"}
}};

test("subscription topics are tenant-scoped and non-authoritative",()=>{
  const a=topicFor({tenantId:"tenant_a",graph:"shared"});
  const b=topicFor({tenantId:"tenant_b",graph:"shared"});
  assert.notEqual(a,b);
  assert.equal(a.includes("shared"),false);
  assert.match(a,/^graph:[0-9a-f]{20}:[0-9a-f]{20}$/);
});

test("authorization requires trusted tenant context",()=>{
  assert.equal(authorizeSubscription({context:{trusted:false,tenantId:"tenant_a"},graph:"shared",catalog}).ok,false);
  assert.equal(authorizeSubscription({context:{trusted:true,tenantId:"tenant_a"},graph:"shared",catalog}).ok,true);
  assert.equal(authorizeSubscription({context:{trusted:true,tenantId:"tenant_b"},graph:"private_a",catalog}).ok,false);
});

test("client event contains ids and no tenant payload",()=>{
  const event=toClientEvent({
    event_seq:"4",event_id:"evt-4",event_type:"graph.mutation.v1",
    graph_name:"shared",operation:"update_vertex",target_kind:"vertex",
    target_label:"Person",target_id:42,occurred_at:"2026-10-05T00:00:00Z"
  });
  assert.deepEqual(event.target,{kind:"vertex",label:"Person",id:"42"});
  assert.equal("tenant_id" in event,false);
  assert.equal("payload" in event,false);
});


test("replay requires an internal trusted relay context",async()=>{
  const fakeDb={query:async()=>{throw new Error("database must not be touched")}};
  await assert.rejects(
    () => import("../../packages/realtime-outbox/index.mjs").then(({replayTenantGraph}) =>
      replayTenantGraph(fakeDb,{tenantId:"tenant_a",graph:"shared"})
    ),
    /trusted realtime relay context is required/
  );
});


test("topic derivation does not expose sensitive graph names",()=>{
  const topic=topicFor({tenantId:"tenant_a",graph:"customer-secret-graph"});
  assert.equal(topic.includes("customer-secret-graph"),false);
  assert.match(topic,/^graph:[0-9a-f]{20}:[0-9a-f]{20}$/);
});
