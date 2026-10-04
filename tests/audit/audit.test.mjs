import test from "node:test";
import assert from "node:assert/strict";
import {createAuditEvent,emitAudit} from "../../packages/audit/index.mjs";

test("structured audit event contains governance metadata but no secrets or raw values",async()=>{
  let event;
  await emitAudit(e=>{event=e;},createAuditEvent({
    requestId:"req-1",
    context:{tenantId:"tenant_a",role:"authenticated",capabilities:["graph:write"]},
    route:"/v1/graph/mutations",tool:"graph.mutate",operation:"delete_vertex",graph:"g",
    outcome:"denied",errorCode:"APPROVAL_REQUIRED",approvalId:"ap-1"
  }));
  assert.deepEqual(event,{
    version:"v1",timestamp:event.timestamp,request_id:"req-1",tenant_id:"tenant_a",
    actor_role:"authenticated",capabilities:["graph:write"],route:"/v1/graph/mutations",
    tool:"graph.mutate",operation:"delete_vertex",graph:"g",outcome:"denied",
    error_code:"APPROVAL_REQUIRED",approval_id:"ap-1"
  });
  assert.equal(Object.hasOwn(event,"token"),false);
  assert.equal(Object.hasOwn(event,"parameters"),false);
  assert.equal(Object.hasOwn(event,"query"),false);
});
