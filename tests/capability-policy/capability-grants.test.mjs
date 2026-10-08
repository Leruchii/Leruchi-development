import test from "node:test";
import assert from "node:assert/strict";
import {CAPABILITY_GRANT_CONTRACT,isCapabilityGrantRevoked,validateCapabilityGrant,verifyCapabilityGrant} from "../../packages/capability-policy/grants.mjs";
import {createControlPlaneRevocationVerifier} from "../../packages/capability-policy/control-plane.mjs";
import {verifyEdDsaCapabilityGrant} from "../../packages/capability-policy/jwt.mjs";
import {signTestCapabilityGrant,TEST_CAPABILITY_ISSUER,TEST_CAPABILITY_PUBLIC_KEYS} from "../fixtures/capability-grant-test-key.mjs";

const grant=()=>({iss:"leruchi-control-plane",sub:"test-actor",jti:"jti-1",tenant_id:"tenant_a",capabilities:["graph:read"],aud:"leruchi",exp:Math.floor(Date.now()/1000)+60});

test("signed capability grant contract is tenant-bound, scoped and time bounded",()=>{
  const value=grant();
  assert.equal(validateCapabilityGrant(value).ok,true);
  assert.equal(validateCapabilityGrant({...value,aud:"other"}).ok,false);
  assert.equal(validateCapabilityGrant({...value,capabilities:["admin:all"]}).ok,false);
  assert.equal(validateCapabilityGrant({...value,scope:{routes:["/v1/graph/query"],graphs:["g"],unexpected:true}}).ok,false);
  assert.equal(CAPABILITY_GRANT_CONTRACT.dataPlaneRule.includes("do not issue"),true);
});

test("grant authorization fails closed without revocation and rejects revoked grants",async()=>{
  const value=grant();
  assert.deepEqual(await verifyCapabilityGrant(value),{ok:false,code:"CAPABILITY_REVOCATION_UNAVAILABLE"});
  assert.deepEqual(await verifyCapabilityGrant(value,{isRevoked:async()=>true}),{ok:false,code:"CAPABILITY_GRANT_REVOKED"});
  assert.equal((await verifyCapabilityGrant(value,{isRevoked:async()=>false})).ok,true);
  assert.equal((await verifyCapabilityGrant({...value,exp:1},{isRevoked:async()=>false})).code,"INVALID_CAPABILITY_GRANT");
  assert.deepEqual(await isCapabilityGrantRevoked(value),{revoked:true,checked:false});
});

test("control-plane revocation adapter requires authenticated active decisions",async()=>{
  const calls=[];
  const verifier=createControlPlaneRevocationVerifier({
    baseUrl:"http://127.0.0.1:4101",
    bearerToken:"secret",
    fetchImpl:async(url,options)=>{
      calls.push({url:String(url),authorization:options.headers.authorization});
      return{ok:true,json:async()=>({active:true,revoked:false})};
    }
  });
  assert.equal(await verifier("jti-2"),false);
  assert.equal(calls[0].authorization,"Bearer secret");
  const malformed=createControlPlaneRevocationVerifier({baseUrl:"http://localhost:4101",bearerToken:"secret",fetchImpl:async()=>({ok:true,json:async()=>({revoked:false})})});
  await assert.rejects(()=>malformed("jti-3"),{code:"CAPABILITY_REVOCATION_UNAVAILABLE"});
  assert.throws(()=>createControlPlaneRevocationVerifier({baseUrl:"http://control.example",bearerToken:"secret"}),/HTTPS/);
});


test("control-plane capability grants use an asymmetric kid-selected public key",()=>{
  const token=signTestCapabilityGrant({sub:"actor",tenant_id:"tenant_a",jti:"ed-grant-1",capabilities:["graph:read"]});
  const grant=verifyEdDsaCapabilityGrant(token,{publicKeys:TEST_CAPABILITY_PUBLIC_KEYS,issuer:TEST_CAPABILITY_ISSUER,audience:"leruchi"});
  assert.equal(grant.tenant_id,"tenant_a");
  assert.deepEqual(grant.capabilities,["graph:read"]);
  assert.throws(()=>verifyEdDsaCapabilityGrant(token+"x",{publicKeys:TEST_CAPABILITY_PUBLIC_KEYS,issuer:TEST_CAPABILITY_ISSUER}),{code:"UNAUTHORIZED"});
  assert.throws(()=>verifyEdDsaCapabilityGrant(token,{publicKeys:TEST_CAPABILITY_PUBLIC_KEYS,issuer:"wrong-issuer"}),{code:"UNAUTHORIZED"});
  assert.throws(()=>verifyEdDsaCapabilityGrant(signTestCapabilityGrant({jti:"expired",exp:1}),{publicKeys:TEST_CAPABILITY_PUBLIC_KEYS,issuer:TEST_CAPABILITY_ISSUER}),{code:"UNAUTHORIZED"});
  assert.throws(()=>verifyEdDsaCapabilityGrant(token,{publicKeys:{},issuer:TEST_CAPABILITY_ISSUER}),{code:"UNAUTHORIZED"});
});
