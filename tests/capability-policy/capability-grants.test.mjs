import test from "node:test";
import assert from "node:assert/strict";
import {CAPABILITY_GRANT_CONTRACT,isCapabilityGrantRevoked,validateCapabilityGrant} from "../../packages/capability-policy/grants.mjs";

test("capability grant contract is scoped and time bounded",()=>{
  const grant={jti:"jti-1",tenant_id:"tenant_a",capabilities:["graph:read"],aud:"leruchi",exp:Math.floor(Date.now()/1000)+60};
  assert.equal(validateCapabilityGrant(grant).ok,true);
  assert.equal(validateCapabilityGrant({...grant,aud:"other"}).ok,false);
  assert.equal(validateCapabilityGrant({...grant,capabilities:["admin:all"]}).ok,false);
  assert.equal(CAPABILITY_GRANT_CONTRACT.dataPlaneRule.includes("do not issue"),true);
});

test("revocation is an external control-plane concern and fails closed when checked",async()=>{
  const grant={jti:"jti-1"};
  assert.deepEqual(await isCapabilityGrantRevoked(grant),{revoked:false,checked:false});
  assert.deepEqual(await isCapabilityGrantRevoked(grant,{isRevoked:async()=>true}),{revoked:true,checked:true});
});
