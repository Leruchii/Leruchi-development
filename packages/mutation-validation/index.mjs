const IDENT=/^[A-Za-z_][A-Za-z0-9_]*$/;
const FIELD=/^[A-Za-z_][A-Za-z0-9_.]*$/;
const OPS=new Set(["create_vertex","create_edge","update_vertex","update_edge","delete_vertex","delete_edge"]);
const DESTRUCTIVE=new Set(["delete_vertex","delete_edge"]);
const ENGINE_KEYS=new Set(["cypher","sql","age","raw","query","statement"]);
const err=(code,message,path=[])=>({version:"v1",code,message,path});
const hasEngine=v=>Array.isArray(v)?v.some(hasEngine):!!v&&typeof v==="object"&&Object.entries(v).some(([k,c])=>ENGINE_KEYS.has(k.toLowerCase())||hasEngine(c));

export function validateMutation(ir,context,catalog){
  const e=[];
  if(!ir||typeof ir!=="object"||Array.isArray(ir))return{ok:false,errors:[err("INVALID_IR","Mutation IR must be an object")]};
  for(const k of ["version","kind","graph","operation","target","parameters"])if(!(k in ir))e.push(err("INVALID_IR","Missing required field: "+k,[k]));
  if(ir.version!=="v1")e.push(err("INVALID_IR_VERSION","Only Mutation IR v1 is accepted",["version"]));
  if(ir.kind!=="graph_mutation")e.push(err("INVALID_IR_KIND","Only graph_mutation is accepted",["kind"]));
  if(hasEngine(ir))e.push(err("ENGINE_FRAGMENT","Engine-specific query fragments are forbidden",[]));
  if(!OPS.has(ir.operation))e.push(err("INVALID_OPERATION","Unsupported mutation operation",["operation"]));
  if(!context?.tenantId)e.push(err("MISSING_TENANT_CONTEXT","Trusted tenant context is required",["context","tenantId"]));
  if(!context?.capabilities?.includes("graph:write"))e.push(err("CAPABILITY_DENIED","graph:write capability is required",["context","capabilities"]));
  if(DESTRUCTIVE.has(ir.operation)&&!context?.capabilities?.includes("graph:delete"))e.push(err("CAPABILITY_DENIED","graph:delete capability is required",["context","capabilities"]));
  if(context?.role==="service_role"&&context?.trustedBackend!==true)e.push(err("SERVICE_ROLE_REQUIRES_TRUSTED_BACKEND","service_role is restricted to trusted backend execution",["context","trustedBackend"]));
  const g=catalog?.graphs?.[ir.graph];if(!g)e.push(err("UNKNOWN_GRAPH","Graph is not present in the Schema Catalog",["graph"]));
  if(g?.visibility==="tenant"&&g.tenantId!==context.tenantId)e.push(err("GRAPH_ACCESS_DENIED","Graph is not authorized for the current tenant",["graph"]));
  const t=ir.target||{};
  const edgeOp=ir.operation?.endsWith("_edge"), create=ir.operation==="create_vertex"||ir.operation==="create_edge", updateDelete=!create;
  if(!t.label||!IDENT.test(t.label))e.push(err("INVALID_TARGET","A valid target label is required",["target","label"]));
  if(g&&t.label&&!g.labels?.includes(t.label))e.push(err("UNKNOWN_LABEL","Mutation label is not present in the Schema Catalog",["target","label"]));
  if(edgeOp){
    if(!t.edge||!IDENT.test(t.edge)||!t.from||!t.to)e.push(err("INVALID_EDGE_TARGET","Edge operations require edge, from, and to endpoint selectors",["target"]));
    if(g&&!g.edges?.some(x=>x.name===t.edge&&x.from===t.from?.label&&x.to===t.to?.label))e.push(err("INVALID_EDGE","Edge or endpoint labels are not present in the Schema Catalog",["target"]));
    for(const side of ["from","to"])if(t[side]&&(!FIELD.test(t[side].field)))e.push(err("INVALID_FIELD","Invalid endpoint selector field",["target",side,"field"]));
  } else if(updateDelete){
    if(!FIELD.test(t.field||""))e.push(err("INVALID_TARGET_SELECTOR","Update/delete operations require a target field",["target","field"]));
  }
  if(t.field&&!FIELD.test(t.field))e.push(err("INVALID_FIELD","Invalid target field",["target","field"]));
  if(!create&&!ir.properties&&ir.operation.startsWith("update_"))e.push(err("EMPTY_UPDATE","Update operations require properties",["properties"]));
  const names=new Set();
  for(let i=0;i<(ir.parameters||[]).length;i++){const p=ir.parameters[i];if(!p||!IDENT.test(p.name)||names.has(p.name))e.push(err("INVALID_PARAMETER","Parameter names must be unique valid identifiers",["parameters",i,"name"]));else names.add(p.name)}
  const refs=[];const walk=(v,path=[])=>{if(Array.isArray(v))v.forEach((x,i)=>walk(x,[...path,i]));else if(v&&typeof v==="object"){if(typeof v.param==="string")refs.push([v.param,path]);Object.entries(v).forEach(([k,x])=>walk(x,[...path,k]))}};walk(ir);
  for(const[n,p]of refs)if(!names.has(n))e.push(err("UNDECLARED_PARAMETER","Parameter "+n+" is not declared",p));
  if(ir.properties&&Object.hasOwn(ir.properties,"tenant_id"))e.push(err("TENANT_FIELD_FORBIDDEN","tenant_id is controlled by trusted tenant context",["properties","tenant_id"]));
  return{ok:e.length===0,errors:e};
}