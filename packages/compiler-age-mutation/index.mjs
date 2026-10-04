const IDENT=/^[A-Za-z_][A-Za-z0-9_]*$/;
const FIELD=/^[A-Za-z_][A-Za-z0-9_.]*$/;
const quote=(v)=>{if(typeof v!=="string"||!IDENT.test(v))throw new Error("INVALID_IDENTIFIER");return v};
const field=(v)=>{if(typeof v!=="string"||!FIELD.test(v))throw new Error("INVALID_FIELD");return v};
const value=(v,bindings,state)=>{if(v&&typeof v==="object"&&!Array.isArray(v)&&Object.hasOwn(v,"param")){quote(v.param);return "$"+v.param}const n="__vibe_literal_"+state.i++;bindings[n]=v;return "$"+n};
const map=(obj,bindings,state,tenant)=>{const entries=[];for(const [k,v] of Object.entries(obj||{})){quote(k);if(k==="tenant_id")throw new Error("TENANT_FIELD_FORBIDDEN");entries.push(k+": "+value(v,bindings,state))}entries.push("tenant_id: $__vibe_tenant_id");return "{"+entries.join(", ")+"}"};
const sqlString=v=>"'"+v.replaceAll("'","''")+"'";
const dq=v=>"$vibe_mutation$\n"+v+"\n$vibe_mutation$";
export function compileAgeMutation(ir,{tenantId}){
  if(typeof tenantId!=="string"||tenantId.length===0)throw new Error("MISSING_TENANT_CONTEXT");
  quote(ir.graph);const t=ir.target;quote(t.label);
  const bindings={__vibe_tenant_id:tenantId};const state={i:0};let c="",columns=["result","target_id"];
  if(ir.operation==="create_vertex"){c="CREATE (n:"+quote(t.label)+" "+map(ir.properties,bindings,state)+") RETURN n AS result, id(n) AS target_id";}
  else if(ir.operation==="create_edge"){quote(t.edge);quote(t.from.label);quote(t.to.label);c="MATCH (a:"+quote(t.from.label)+"), (b:"+quote(t.to.label)+") WHERE a."+field(t.from.field)+" = "+value(t.from.value,bindings,state)+" AND b."+field(t.to.field)+" = "+value(t.to.value,bindings,state)+" AND a.tenant_id = $__vibe_tenant_id AND b.tenant_id = $__vibe_tenant_id CREATE (a)-[e:"+quote(t.edge)+" "+map(ir.properties,bindings,state)+" ]->(b) RETURN e AS result, id(e) AS target_id";}
  else {const alias=ir.operation.endsWith("_edge")?"e":"n";if(ir.operation.endsWith("_edge")){quote(t.edge);c="MATCH (a:"+quote(t.from.label)+")-[e:"+quote(t.edge)+"]->(b:"+quote(t.to.label)+") WHERE a."+field(t.from.field)+" = "+value(t.from.value,bindings,state)+" AND b."+field(t.to.field)+" = "+value(t.to.value,bindings,state)+" AND a.tenant_id = $__vibe_tenant_id AND b.tenant_id = $__vibe_tenant_id";}else{c="MATCH (n:"+quote(t.label)+") WHERE n."+field(t.field)+" = "+value(t.value,bindings,state)+" AND n.tenant_id = $__vibe_tenant_id";}
    if(ir.operation==="update_vertex"||ir.operation==="update_edge") c+=" SET "+Object.entries(ir.properties||{}).map(([k,v])=>{quote(k);if(k==="tenant_id")throw new Error("TENANT_FIELD_FORBIDDEN");return alias+"."+k+" = "+value(v,bindings,state)}).join(", ")+" RETURN "+alias+" AS result, id("+alias+") AS target_id";
    else if(ir.operation==="delete_vertex"||ir.operation==="delete_edge") c+=" DELETE "+alias+" RETURN "+alias+" AS result";
  }
  return {engine:"apache-age",version:"v1",sql:"SELECT * FROM cypher("+sqlString(ir.graph)+", "+dq(c)+", $1) AS (result agtype);",cypher:c,parameterNames:[...ir.parameters.map(p=>p.name),...Object.keys(bindings).filter(k=>k!=="__vibe_tenant_id")],literalBindings:bindings,columns};
}
