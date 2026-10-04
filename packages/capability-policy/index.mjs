export const CAPABILITIES=Object.freeze({
  GRAPH_READ:"graph:read",
  GRAPH_WRITE:"graph:write",
  GRAPH_DELETE:"graph:delete"
});

export const CAPABILITY_ROUTE_POLICY=Object.freeze({
  schemaCatalog:CAPABILITIES.GRAPH_READ,
  graphQuery:CAPABILITIES.GRAPH_READ,
  graphMutation:CAPABILITIES.GRAPH_WRITE,
  graphDelete:CAPABILITIES.GRAPH_DELETE
});

export function hasCapability(context,capability){
  return Boolean(context?.capabilities?.includes(capability));
}

export function requireCapability(context,capability){
  if(!hasCapability(context,capability)){
    return {ok:false,code:"CAPABILITY_DENIED",message:capability+" capability is required"};
  }
  return {ok:true};
}
