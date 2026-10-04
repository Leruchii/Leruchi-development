import test from "node:test";
import assert from "node:assert/strict";
import {CAPABILITIES,CAPABILITY_ROUTE_POLICY,hasCapability,requireCapability} from "../../packages/capability-policy/index.mjs";

test("capability vocabulary and route policy are canonical",()=>{
  assert.deepEqual(CAPABILITIES,{GRAPH_READ:"graph:read",GRAPH_WRITE:"graph:write",GRAPH_DELETE:"graph:delete",VECTOR_READ:"vector:read"});
  assert.equal(CAPABILITY_ROUTE_POLICY.schemaCatalog,CAPABILITIES.GRAPH_READ);
  assert.equal(CAPABILITY_ROUTE_POLICY.graphQuery,CAPABILITIES.GRAPH_READ);
  assert.equal(CAPABILITY_ROUTE_POLICY.graphMutation,CAPABILITIES.GRAPH_WRITE);
  assert.equal(CAPABILITY_ROUTE_POLICY.graphDelete,CAPABILITIES.GRAPH_DELETE);
  assert.equal(CAPABILITY_ROUTE_POLICY.vectorRetrieval,CAPABILITIES.VECTOR_READ);
});

test("capability checks fail closed",()=>{
  const context={capabilities:["graph:read"]};
  assert.equal(hasCapability(context,CAPABILITIES.GRAPH_READ),true);
  assert.equal(hasCapability(context,CAPABILITIES.GRAPH_WRITE),false);
  assert.deepEqual(requireCapability(context,CAPABILITIES.GRAPH_WRITE),{ok:false,code:"CAPABILITY_DENIED",message:"graph:write capability is required"});
  assert.deepEqual(requireCapability(context,CAPABILITIES.GRAPH_READ),{ok:true});
});
