import test from "node:test";
import assert from "node:assert/strict";
import {createMutationApprovalDigest,verifyMutationApproval,mutationImpact} from "../../packages/mutation-approval/index.mjs";

const context={tenantId:"tenant_a",role:"authenticated",capabilities:["graph:write","graph:delete"]};
const ir={version:"v1",kind:"graph_mutation",graph:"g",operation:"delete_vertex",target:{label:"Person",field:"id",value:1},parameters:[]};

test("destructive mutations require approval and preview is represented as impact",async()=>{
  assert.deepEqual(mutationImpact(ir),{operation:"delete_vertex",graph:"g",target_kind:"vertex",target_label:"Person",destructive:true});
  const denied=await verifyMutationApproval({ir,parameters:{},context});
  assert.equal(denied.code,"APPROVAL_REQUIRED");
});

test("approval is scoped to tenant, exact mutation digest, expiry, and control-plane verifier",async()=>{
  const digest=createMutationApprovalDigest(ir,{});
  const approval={id:"ap-1",tenant_id:"tenant_a",digest,expires_at:new Date(Date.now()+60000).toISOString()};
  const seen=[];
  const ok=await verifyMutationApproval({ir,parameters:{},context,approval,verifyApproval:async input=>{seen.push(input);return true;}});
  assert.equal(ok.ok,true);
  assert.equal(seen[0].digest,digest);
  const wrongTenant=await verifyMutationApproval({ir,parameters:{},context:{...context,tenantId:"tenant_b"},approval,verifyApproval:async()=>true});
  assert.equal(wrongTenant.code,"APPROVAL_TENANT_MISMATCH");
  const wrongDigest=await verifyMutationApproval({ir,parameters:{x:1},context,approval,verifyApproval:async()=>true});
  assert.equal(wrongDigest.code,"APPROVAL_SCOPE_MISMATCH");
});

test("expired or unconfigured approval fails closed",async()=>{
  const approval={id:"ap-1",tenant_id:"tenant_a",digest:createMutationApprovalDigest(ir,{}),expires_at:new Date(Date.now()-1000).toISOString()};
  const expired=await verifyMutationApproval({ir,parameters:{},context,approval,verifyApproval:async()=>true});
  assert.equal(expired.code,"APPROVAL_EXPIRED");
  const live={...approval,expires_at:new Date(Date.now()+60000).toISOString()};
  const unavailable=await verifyMutationApproval({ir,parameters:{},context,approval:live});
  assert.equal(unavailable.code,"APPROVAL_VERIFIER_UNAVAILABLE");
});
