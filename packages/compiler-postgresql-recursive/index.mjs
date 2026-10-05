const IDENT=/^[A-Za-z_][A-Za-z0-9_]*$/;
const FIELD=/^[A-Za-z_][A-Za-z0-9_.]*$/;
function ident(v,l){if(typeof v!=="string"||!IDENT.test(v))throw new Error("INVALID_IDENTIFIER:"+l);return v;}
function field(v){if(typeof v!=="string"||!FIELD.test(v))throw new Error("INVALID_FIELD");return v;}
function qualified(s,l){if(!s||typeof s!=="object")throw new Error("MISSING_RELATIONAL_MAPPING:"+l);return ident(s.schema,l+".schema")+"."+ident(s.table,l+".table");}
function sqlString(v){return "'"+v.replaceAll("'","''")+"'";}
function parameter(v,b,s){if(v&&typeof v==="object"&&!Array.isArray(v)&&Object.hasOwn(v,"param")){ident(v.param,"parameter");return "($1::jsonb ->> "+sqlString(v.param)+")";}const n="__vibe_literal_"+s.i++;b[n]=v;return "($1::jsonb ->> "+sqlString(n)+")";}
function mappingFor(g,label){const m=g?.relational?.labels?.[label];if(!m)throw new Error("MISSING_RELATIONAL_MAPPING:"+label);return m;}
function edgeMapping(g,edge){const m=g?.relational?.edges?.[edge];if(!m)throw new Error("MISSING_RELATIONAL_EDGE_MAPPING:"+edge);return m;}
function filterSql(f,allowed,targetAlias,b,s){const raw=field(f.field), parts=raw.split(".");const a=parts.length===2?parts[0]:targetAlias,c=parts.length===2?parts[1]:parts[0];if(!allowed.has(a))throw new Error("UNSUPPORTED_FILTER_FIELD:"+a);if(f.op==="is_null")return a+"."+ident(c,"filter.column")+" IS NULL";const ops={eq:"=",neq:"<>",gt:">",gte:">=",lt:"<",lte:"<=",in:"IN"};if(!ops[f.op])throw new Error("UNSUPPORTED_FILTER:"+f.op);return a+"."+ident(c,"filter.column")+" "+ops[f.op]+" "+parameter(f.value,b,s);}
function projectionSql(i,allowed,targetAlias){const raw=field(i.field),parts=raw.split("."),a=parts.length===2?parts[0]:targetAlias,c=parts.length===2?parts[1]:parts[0];if(!allowed.has(a))throw new Error("UNSUPPORTED_PROJECTION_FIELD:"+a);return a+"."+ident(c,"projection.column")+" AS "+ident(i.alias??(a+"_"+c),"projection.alias");}
export function compilePostgresqlRecursive(ir,catalog){
if(!ir||ir.version!=="v1"||ir.kind!=="graph_query")throw new Error("INVALID_QUERY_IR");
if(!Array.isArray(ir.steps)||ir.steps.length===0)throw new Error("UNSUPPORTED_QUERY_SHAPE:steps_required");
if(!Number.isInteger(ir.depth)||ir.depth<0||ir.depth>ir.steps.length)throw new Error("UNSUPPORTED_QUERY_SHAPE:depth_exceeds_steps");
const graph=catalog?.graphs?.[ir.graph];if(!graph)throw new Error("UNKNOWN_GRAPH:"+ir.graph);
if(ir.extensions&&Object.keys(ir.extensions).length)throw new Error("UNSUPPORTED_EXTENSION");
const rootMap=mappingFor(graph,ir.root.label), bindings={}, state={i:0}, rootTable=qualified(rootMap,"root"), rootId=ident(rootMap.id_column,"root.id_column"), rootTenant=ident(rootMap.tenant_column??"tenant_id","root.tenant_column");
const allowed=new Set([ir.root.alias,...ir.steps.map(x=>x.target.alias)]);
const rootFilters=ir.filters.filter(f=>field(f.field).split(".")[0]===ir.root.alias);
const seed=["v."+rootTenant+" = current_setting('request.jwt.claims',true)::jsonb ->> 'tenant_id'"];
for(const f of rootFilters)seed.push(filterSql(f,allowed,ir.root.alias,bindings,state));
let sql="WITH RECURSIVE walk(step_no, node_id, node_label, depth, path) AS (";
sql+=" SELECT 0, v."+rootId+"::text, "+sqlString(ir.root.label)+", 0, ARRAY["+sqlString(ir.root.label)+" || ':' || v."+rootId+"::text] FROM "+rootTable+" v WHERE "+seed.join(" AND ");
sql+=" UNION ALL";
const branches=[];
for(let i=0;i<ir.steps.length;i++){if(i>=ir.depth)continue;const step=ir.steps[i], sourceLabel=i===0?ir.root.label:ir.steps[i-1].target.label, sourceMap=mappingFor(graph,sourceLabel), targetMap=mappingFor(graph,step.target.label), edge=edgeMapping(graph,step.edge), edgeTable=qualified(edge,"edge"), sourceId=ident(sourceMap.id_column,"source.id_column"), targetId=ident(targetMap.id_column,"target.id_column"), edgeFrom=ident(edge.from_column,"edge.from_column"), edgeTo=ident(edge.to_column,"edge.to_column"), targetTenant=ident(targetMap.tenant_column??"tenant_id","target.tenant_column");
const targetTable=qualified(targetMap,"target");
const make=(edgeCondition,joinTarget)=>" SELECT "+(i+1)+", t."+targetId+"::text, "+sqlString(step.target.label)+", w.depth + 1, w.path || ("+sqlString(step.target.label)+" || ':' || t."+targetId+"::text) FROM walk w JOIN "+edgeTable+" e ON "+edgeCondition+" JOIN "+targetTable+" t ON "+joinTarget+" WHERE w.step_no = "+i+" AND w.depth < "+ir.depth+" AND t."+targetTenant+" = current_setting('request.jwt.claims',true)::jsonb ->> 'tenant_id' AND NOT (("+sqlString(step.target.label)+" || ':' || t."+targetId+"::text) = ANY(w.path))";
if(step.direction==="out"||step.direction==="both")branches.push(make("e."+edgeFrom+"::text = w.node_id","t."+targetId+" = e."+edgeTo));
if(step.direction==="in"||step.direction==="both")branches.push(make("e."+edgeTo+"::text = w.node_id","t."+targetId+" = e."+edgeFrom));
}
if(!branches.length)throw new Error("UNSUPPORTED_QUERY_SHAPE:empty_recursive_path");
sql+=branches.join(" UNION ALL")+" )";
const finalStep=ir.steps.at(-1), finalMap=mappingFor(graph,finalStep.target.label), finalTable=qualified(finalMap,"target"), finalId=ident(finalMap.id_column,"target.id_column"), finalTenant=ident(finalMap.tenant_column??"tenant_id","target.tenant_column");
const projection=ir.projection.map(x=>projectionSql(x,allowed,finalStep.target.alias));
const where=["t."+finalTenant+" = $vibe_tenant_id","w.depth > 0","w.depth <= "+ir.depth];
for(const f of ir.filters.filter(f=>field(f.field).split(".")[0]!==ir.root.alias))where.push(filterSql(f,allowed,finalStep.target.alias,bindings,state));
const order=ir.orderBy.map(o=>{const p=field(o.field).split(".");if(p.length!==2||!allowed.has(p[0]))throw new Error("UNSUPPORTED_ORDER_FIELD");return p[0]+"."+ident(p[1],"order.column")+" "+o.direction.toUpperCase();}).join(", ");
sql+=" SELECT "+projection.join(", ")+" FROM walk w JOIN "+finalTable+" t ON t."+finalId+"::text = w.node_id WHERE "+where.join(" AND ")+(order?" ORDER BY "+order:"")+" OFFSET "+ir.offset+" LIMIT "+ir.limit+";";
return {engine:"postgresql-recursive",version:"v1",sql,parameterNames:ir.parameters.map(p=>p.name).concat(Object.keys(bindings)),literalBindings:bindings,columns:ir.projection.map(x=>ident(x.alias??x.field.replaceAll(".","_"),"projection.alias")),sourceAliases:[ir.root.alias,...ir.steps.map(x=>x.target.alias)]};
}