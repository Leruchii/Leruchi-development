import {CAPABILITIES} from "./index.mjs";

const ALLOWED=new Set(Object.values(CAPABILITIES));

export function validateCapabilityGrant(grant,now=Math.floor(Date.now()/1000)){
  const errors=[];
  if(!grant||typeof grant!=="object")return{ok:false,errors:["grant is required"]};
  if(typeof grant.jti!=="string"||!grant.jti)errors.push("jti is required");
  if(typeof grant.tenant_id!=="string"||!grant.tenant_id)errors.push("tenant_id is required");
  if(!Array.isArray(grant.capabilities)||grant.capabilities.length===0)errors.push("capabilities are required");
  else if(grant.capabilities.some(value=>typeof value!=="string"||!ALLOWED.has(value)))errors.push("capability is outside the canonical vocabulary");
  if(grant.aud!=="vibedb")errors.push("aud must be vibedb");
  if(!Number.isInteger(grant.exp)||grant.exp<=now)errors.push("grant is expired or missing exp");
  if(grant.nbf!==undefined&&(!Number.isInteger(grant.nbf)||grant.nbf>now))errors.push("grant is not active");
  if(grant.scope!==undefined&&(!grant.scope||typeof grant.scope!=="object"))errors.push("scope must be an object");
  return{ok:errors.length===0,errors};
}

export async function isCapabilityGrantRevoked(grant,{isRevoked}={}){
  if(typeof isRevoked!=="function")return{revoked:false,checked:false};
  return{revoked:await isRevoked(grant.jti),checked:true};
}

export const CAPABILITY_GRANT_CONTRACT=Object.freeze({
  issuer:"control-plane",
  audience:"vibedb",
  required:["jti","tenant_id","capabilities","aud","exp"],
  revocation:"external control-plane lookup by jti",
  dataPlaneRule:"validate and enforce the grant; do not issue or persist authorization state"
});
