const IDENT=/^[A-Za-z_][A-Za-z0-9_]*$/;
const FIELD=/^[A-Za-z_][A-Za-z0-9_.]*$/;

function ident(v,label){
  if(typeof v!=="string"||!IDENT.test(v)) throw new Error("INVALID_IDENTIFIER:"+label);
  return v;
}
function field(v){
  if(typeof v!=="string"||!FIELD.test(v)) throw new Error("INVALID_FIELD");
  return v;
}
function qualified(source,label){
  if(!source||typeof source!=="object") throw new Error("MISSING_RELATIONAL_MAPPING:"+label);
  return ident(source.schema,label+".schema")+"."+ident(source.table,label+".table");
}
function sqlString(v){return "'"+String(v).replaceAll("'","''")+"'";}
function parameter(v,bindings,state){
  if(v&&typeof v==="object"&&!Array.isArray(v)&&Object.hasOwn(v,"param")){
    ident(v.param,"parameter");
    return "($1::jsonb ->> "+sqlString(v.param)+")";
  }
  const name="__vibe_literal_"+state.i++;
  bindings[name]=v;
  return "($1::jsonb ->> "+sqlString(name)+")";
}
function mappingFor(graph,label){
  const mapping=graph?.relational?.labels?.[label];
  if(!mapping) throw new Error("MISSING_RELATIONAL_MAPPING:"+label);
  return mapping;
}
function edgeMapping(graph,edge){
  const mapping=graph?.relational?.edges?.[edge];
  if(!mapping) throw new Error("MISSING_RELATIONAL_EDGE_MAPPING:"+edge);
  return mapping;
}
function splitField(raw){
  const value=field(raw), parts=value.split(".");
  if(parts.length!==2) throw new Error("UNSUPPORTED_FIELD_SHAPE:"+value);
  return parts;
}
function filterSql(filter,expectedAlias,sqlAlias,bindings,state){
  const [alias,column]=splitField(filter.field);
  if(alias!==expectedAlias) throw new Error("UNSUPPORTED_FILTER_ALIAS:"+alias);
  if(filter.op==="is_null") return sqlAlias+"."+ident(column,"filter.column")+" IS NULL";
  const ops={eq:"=",neq:"<>",gt:">",gte:">=",lt:"<",lte:"<=",in:"IN"};
  const op=ops[filter.op];
  if(!op) throw new Error("UNSUPPORTED_FILTER:"+filter.op);
  return sqlAlias+"."+ident(column,"filter.column")+" "+op+" "+parameter(filter.value,bindings,state);
}
function projectionSql(item,expectedAlias,sqlAlias){
  const [alias,column]=splitField(item.field);
  if(alias!==expectedAlias) throw new Error("UNSUPPORTED_PROJECTION_ALIAS:"+alias);
  return sqlAlias+"."+ident(column,"projection.column")+" AS "+ident(item.alias??(alias+"_"+column),"projection.alias");
}
function sameMapping(a,b,keys){
  return keys.every(key=>(a?.[key]??null)===(b?.[key]??null));
}

/**
 * Stage 21 PostgreSQL recursive fallback.
 *
 * Initial supported subset is intentionally narrow and auditable:
 * - one or more repetitions of the same edge traversal;
 * - the same relational vertex mapping at each hop;
 * - one consistent direction (out, in, or both);
 * - root filters and final-node filters/projections/order;
 * - tenant identity from transaction-local trusted JWT claims;
 * - request/literal values from the canonical JSON parameter map in $1.
 *
 * Heterogeneous multi-label/multi-edge traversals fail closed until a later
 * Stage 21 increment has database-backed evidence.
 */
export function compilePostgresqlRecursive(ir,catalog){
  if(!ir||ir.version!=="v1"||ir.kind!=="graph_query") throw new Error("INVALID_QUERY_IR");
  if(!Array.isArray(ir.steps)||ir.steps.length===0) throw new Error("UNSUPPORTED_QUERY_SHAPE:steps_required");
  if(!Number.isInteger(ir.depth)||ir.depth<1||ir.depth>ir.steps.length) throw new Error("UNSUPPORTED_QUERY_SHAPE:depth");
  if(ir.extensions&&Object.keys(ir.extensions).length) throw new Error("UNSUPPORTED_EXTENSION");

  const graph=catalog?.graphs?.[ir.graph];
  if(!graph) throw new Error("UNKNOWN_GRAPH:"+ir.graph);

  const rootMap=mappingFor(graph,ir.root.label);
  const first=ir.steps[0];
  const edgeMap=edgeMapping(graph,first.edge);
  const targetMap=mappingFor(graph,first.target.label);

  if(!sameMapping(rootMap,targetMap,["schema","table","id_column","tenant_column"])) {
    throw new Error("UNSUPPORTED_QUERY_SHAPE:heterogeneous_vertex_mapping");
  }
  for(const step of ir.steps.slice(1)){
    if(step.edge!==first.edge||step.direction!==first.direction||step.target.label!==first.target.label)
      throw new Error("UNSUPPORTED_QUERY_SHAPE:heterogeneous_traversal");
    const stepEdge=edgeMapping(graph,step.edge);
    const stepTarget=mappingFor(graph,step.target.label);
    if(!sameMapping(edgeMap,stepEdge,["schema","table","from_column","to_column"])||
       !sameMapping(targetMap,stepTarget,["schema","table","id_column","tenant_column"]))
      throw new Error("UNSUPPORTED_QUERY_SHAPE:heterogeneous_mapping");
  }

  const vertexTable=qualified(rootMap,"vertex");
  const edgeTable=qualified(edgeMap,"edge");
  const id=ident(rootMap.id_column,"vertex.id_column");
  const tenant=ident(rootMap.tenant_column??"tenant_id","vertex.tenant_column");
  const edgeFrom=ident(edgeMap.from_column,"edge.from_column");
  const edgeTo=ident(edgeMap.to_column,"edge.to_column");
  const tenantExpr="current_setting('request.jwt.claims',true)::jsonb ->> 'tenant_id'";
  const bindings={}, state={i:0};

  const rootFilters=ir.filters.filter(x=>splitField(x.field)[0]===ir.root.alias);
  const finalAlias=ir.steps[ir.depth-1].target.alias;
  const finalFilters=ir.filters.filter(x=>splitField(x.field)[0]!==ir.root.alias);
  for(const filter of finalFilters){
    const [alias]=splitField(filter.field);
    if(alias!==finalAlias) throw new Error("UNSUPPORTED_FILTER_ALIAS:"+alias);
  }

  const seed=["v."+tenant+" = "+tenantExpr];
  for(const filter of rootFilters) seed.push(filterSql(filter,ir.root.alias,"v",bindings,state));

  let edgeJoin;
  if(first.direction==="out") edgeJoin="e."+edgeFrom+"::text = w.node_id";
  else if(first.direction==="in") edgeJoin="e."+edgeTo+"::text = w.node_id";
  else if(first.direction==="both") edgeJoin="(e."+edgeFrom+"::text = w.node_id OR e."+edgeTo+"::text = w.node_id)";
  else throw new Error("INVALID_DIRECTION");

  let targetJoin;
  if(first.direction==="out") targetJoin="t."+id+" = e."+edgeTo;
  else if(first.direction==="in") targetJoin="t."+id+" = e."+edgeFrom;
  else targetJoin="t."+id+" = CASE WHEN e."+edgeFrom+"::text = w.node_id THEN e."+edgeTo+" ELSE e."+edgeFrom+" END";

  let sql="WITH RECURSIVE walk(node_id, depth, path) AS (";
  sql+=" SELECT v."+id+"::text, 0, ARRAY[v."+id+"::text] FROM "+vertexTable+" v WHERE "+seed.join(" AND ");
  sql+=" UNION ALL";
  sql+=" SELECT t."+id+"::text, w.depth + 1, w.path || t."+id+"::text";
  sql+=" FROM walk w JOIN "+edgeTable+" e ON "+edgeJoin;
  sql+=" JOIN "+vertexTable+" t ON "+targetJoin;
  sql+=" WHERE w.depth < "+ir.depth;
  sql+=" AND t."+tenant+" = "+tenantExpr;
  sql+=" AND NOT (t."+id+"::text = ANY(w.path))";
  sql+=" )";

  const projection=ir.projection.map(item=>projectionSql(item,finalAlias,"t"));
  const where=["w.depth = "+ir.depth,"t."+tenant+" = "+tenantExpr];
  for(const filter of finalFilters) where.push(filterSql(filter,finalAlias,"t",bindings,state));

  const order=ir.orderBy.map(item=>{
    const [alias,column]=splitField(item.field);
    if(alias!==finalAlias) throw new Error("UNSUPPORTED_ORDER_ALIAS:"+alias);
    if(!["asc","desc"].includes(item.direction)) throw new Error("INVALID_ORDER_DIRECTION");
    return "t."+ident(column,"order.column")+" "+item.direction.toUpperCase();
  }).join(", ");

  sql+=" SELECT "+projection.join(", ");
  sql+=" FROM walk w JOIN "+vertexTable+" t ON t."+id+"::text = w.node_id";
  sql+=" WHERE "+where.join(" AND ");
  if(order) sql+=" ORDER BY "+order;
  sql+=" OFFSET "+ir.offset+" LIMIT "+ir.limit+";";

  return {
    engine:"postgresql-recursive",
    version:"v1",
    sql,
    parameterNames:ir.parameters.map(p=>p.name).concat(Object.keys(bindings)),
    literalBindings:bindings,
    columns:ir.projection.map(item=>ident(item.alias??item.field.replaceAll(".","_"),"projection.alias")),
    sourceAliases:[ir.root.alias,...ir.steps.slice(0,ir.depth).map(step=>step.target.alias)]
  };
}
