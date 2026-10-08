import {CAPABILITIES} from "./index.mjs";

const ALLOWED=new Set(Object.values(CAPABILITIES));
const SCOPE_KEYS=new Set(["routes","graphs"]);

export function validateCapabilityGrant(grant,now=Math.floor(Date.now()/1000)){
  const errors=[];
  if(!grant||typeof grant!=="object"||Array.isArray(grant))return{ok:false,errors:["grant is required"]};
  if(typeof grant.jti!=="string"||!grant.jti.trim())errors.push("jti is required");
  if(typeof grant.tenant_id!=="string"||!grant.tenant_id.trim())errors.push("tenant_id is required");
  if(!Array.isArray(grant.capabilities)||grant.capabilities.length===0)errors.push("capabilities are required");
  else if(grant.capabilities.some(value=>typeof value!=="string"||!ALLOWED.has(value)))errors.push("capability is outside the canonical vocabulary");
  if(grant.aud!=="leruchi")errors.push("aud must be leruchi");
  if(!Number.isInteger(grant.exp)||grant.exp<=now)errors.push("grant is expired or missing exp");
  if(grant.nbf!==undefined&&(!Number.isInteger(grant.nbf)||grant.nbf>now))errors.push("grant is not active");
  if(grant.scope!==undefined){
    if(!grant.scope||typeof grant.scope!=="object"||Array.isArray(grant.scope))errors.push("scope must be an object");
    else{
      if(Object.keys(grant.scope).some(key=>!SCOPE_KEYS.has(key)))errors.push("scope contains an unsupported key");
      for(const key of SCOPE_KEYS){
        if(grant.scope[key]!==undefined&&(!Array.isArray(grant.scope[key])||grant.scope[key].length===0||grant.scope[key].some(value=>typeof value!=="string"||!value.trim())))errors.push("scope."+key+" must be a non-empty string array");
      }
    }
  }
  return{ok:errors.length===0,errors};
}

export function isCapabilityGrantScopeAllowed(grant,route,graphName){
  const scope=grant?.scope;
  if(!scope||typeof scope!=="object")return true;
  if(Array.isArray(scope.routes)&&!scope.routes.includes(route))return false;
  if(Array.isArray(scope.graphs)&&(typeof graphName!=="string"||!scope.graphs.includes(graphName)))return false;
  return true;
}

export async function verifyCapabilityGrant(grant,{isRevoked,now=Math.floor(Date.now()/1000)}={}){
  const validation=validateCapabilityGrant(grant,now);
  if(!validation.ok)return{ok:false,code:"INVALID_CAPABILITY_GRANT",errors:validation.errors};
  if(typeof isRevoked!=="function")return{ok:false,code:"CAPABILITY_REVOCATION_UNAVAILABLE"};
  let revoked;
  try{revoked=await isRevoked(grant.jti);}catch{return{ok:false,code:"CAPABILITY_REVOCATION_UNAVAILABLE"};}
  if(typeof revoked!=="boolean")return{ok:false,code:"CAPABILITY_REVOCATION_UNAVAILABLE"};
  if(revoked)return{ok:false,code:"CAPABILITY_GRANT_REVOKED"};
  return{ok:true,grant};
}

export async function isCapabilityGrantRevoked(grant,{isRevoked}={}){
  if(typeof isRevoked!=="function")return{revoked:true,checked:false};
  try{
    const revoked=await isRevoked(grant?.jti);
    if(typeof revoked!=="boolean")return{revoked:true,checked:false};
    return{revoked,checked:true};
  }catch{return{revoked:true,checked:false};}
}

export const CAPABILITY_GRANT_CONTRACT=Object.freeze({
  issuer:"control-plane",
  audience:"leruchi",
  required:["jti","tenant_id","capabilities","aud","exp"],
  revocation:"mandatory fail-closed control-plane lookup by jti",
  dataPlaneRule:"validate and enforce the signed grant; do not issue or persist authorization state"
});
