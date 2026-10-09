import {createPublicKey,verify} from "node:crypto";

function unauthorized(message="Invalid capability grant signature"){
  const error=new Error(message);
  error.code="UNAUTHORIZED";
  return error;
}
function decodeJson(segment){
  return JSON.parse(Buffer.from(segment,"base64url").toString("utf8"));
}

export function verifyEdDsaCapabilityGrant(token,{publicKeys,issuer,audience="leruchi",now=Math.floor(Date.now()/1000)}={}){
  if(typeof token!=="string"||!token)throw unauthorized("Capability grant token is required");
  if(!issuer||typeof issuer!=="string")throw unauthorized("Capability grant issuer is not configured");
  if(!publicKeys||typeof publicKeys!=="object"||Array.isArray(publicKeys)||Object.keys(publicKeys).length===0)throw unauthorized("Capability grant public keys are not configured");
  const parts=token.split(".");
  if(parts.length!==3)throw unauthorized("Invalid capability grant token");
  let header,payload;
  try{header=decodeJson(parts[0]);payload=decodeJson(parts[1]);}catch{throw unauthorized("Invalid capability grant token");}
  if(!header||header.alg!=="EdDSA"||header.typ!=="JWT"||typeof header.kid!=="string"||!header.kid.trim())throw unauthorized("Unsupported capability grant token");
  if(Object.keys(header).some(key=>!["alg","typ","kid"].includes(key)))throw unauthorized("Unsupported capability grant header");
  const encodedKey=publicKeys[header.kid];
  if(typeof encodedKey!=="string"||!encodedKey)throw unauthorized("Unknown capability grant signing key");
  let key;
  try{
    key=encodedKey.includes("BEGIN PUBLIC KEY")
      ?createPublicKey(encodedKey)
      :createPublicKey({key:Buffer.from(encodedKey,"base64"),format:"der",type:"spki"});
  }catch{throw unauthorized("Invalid capability grant public key");}
  let valid=false;
  try{valid=verify(null,Buffer.from(parts[0]+"."+parts[1]),key,Buffer.from(parts[2],"base64url"));}catch{valid=false;}
  if(!valid)throw unauthorized("Invalid capability grant signature");
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw unauthorized("Invalid capability grant claims");
  if(payload.iss!==issuer)throw unauthorized("Invalid capability grant issuer");
  if(payload.aud!==audience)throw unauthorized("Invalid capability grant audience");
  if(!Number.isInteger(payload.exp)||payload.exp<=now)throw unauthorized("Expired or missing capability grant expiry");
  if(payload.nbf!==undefined&&(!Number.isInteger(payload.nbf)||payload.nbf>now))throw unauthorized("Capability grant is not active");
  if(typeof payload.jti!=="string"||!payload.jti.trim())throw unauthorized("Capability grant jti is required");
  if(typeof payload.tenant_id!=="string"||!payload.tenant_id.trim())throw unauthorized("Capability grant tenant is required");
  return payload;
}
