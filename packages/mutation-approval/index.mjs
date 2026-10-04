import {createHash} from "node:crypto";

const DESTRUCTIVE=new Set(["delete_vertex","delete_edge"]);

function canonical(value){
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    return "{"+Object.keys(value).sort().map(key=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
  }
  return JSON.stringify(value);
}

export function isDestructiveMutation(ir){
  return DESTRUCTIVE.has(ir?.operation);
}

export function createMutationApprovalDigest(ir,parameters={}){
  return createHash("sha256").update(canonical({version:"v1",ir,parameters})).digest("hex");
}

export async function verifyMutationApproval({ir,parameters,context,approval,verifyApproval}){
  if(!isDestructiveMutation(ir))return {ok:true};
  if(!approval||typeof approval!=="object")return {ok:false,code:"APPROVAL_REQUIRED",message:"Destructive mutations require an approval artifact"};
  if(typeof approval.id!=="string"||approval.id.trim()==="")return {ok:false,code:"INVALID_APPROVAL",message:"Approval id is required"};
  if(approval.tenant_id!==context.tenantId)return {ok:false,code:"APPROVAL_TENANT_MISMATCH",message:"Approval is not scoped to the authenticated tenant"};
  const digest=createMutationApprovalDigest(ir,parameters);
  if(approval.digest!==digest)return {ok:false,code:"APPROVAL_SCOPE_MISMATCH",message:"Approval does not authorize this exact mutation"};
  const expiresAt=Date.parse(approval.expires_at??"");
  if(!Number.isFinite(expiresAt)||expiresAt<=Date.now())return {ok:false,code:"APPROVAL_EXPIRED",message:"Approval has expired"};
  if(typeof verifyApproval!=="function")return {ok:false,code:"APPROVAL_VERIFIER_UNAVAILABLE",message:"Destructive approval verification is not configured"};
  const valid=await verifyApproval({approval,context,digest,operation:ir.operation});
  return valid===true?{ok:true}:{ok:false,code:"APPROVAL_REJECTED",message:"Approval was rejected by the authorization control plane"};
}

export function mutationImpact(ir){
  return {operation:ir?.operation??null,graph:ir?.graph??null,target_kind:ir?.operation?.endsWith("_edge")?"edge":"vertex",target_label:ir?.target?.label??null,destructive:isDestructiveMutation(ir)};
}
