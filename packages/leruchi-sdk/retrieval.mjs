import {validateRetrievalIR} from "../retrieval-ir/index.mjs";

const IDENT=/^[A-Za-z_][A-Za-z0-9_]*$/;
const CATALOG=/^[A-Za-z_][A-Za-z0-9_.]*$/;
const PARAM_TYPES=new Set(["string","integer","number","boolean","uuid","vector","json"]);

function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
function assertIdentifier(value,name){if(typeof value!=="string"||!IDENT.test(value))throw new Error(`${name} must be a valid identifier`);return value;}
function assertCatalog(value){if(typeof value!=="string"||!CATALOG.test(value))throw new Error("catalogRef must be a safe catalog reference");return value;}
function assertPositiveNumber(value,name){if(!(value>0)||!Number.isFinite(value))throw new Error(`${name} must be positive`);return value;}

export class RetrievalBuilderError extends Error{
  constructor(code,message,details=undefined){super(message);this.name="RetrievalBuilderError";this.code=code;this.details=details;}
}

export class RetrievalBuilder{
  constructor(client){
    this.client=client;
    this.ir={
      version:"v1",kind:"retrieval_query",sources:{},
      fusion:{strategy:"weighted_rrf",vector_weight:1,graph_weight:1},
      limits:{max_results:20,max_cost:40}
    };
    this.bound={};
  }
  graph(query,{identityField="id",candidateLimit=undefined}={}){
    if(!query||typeof query!=="object"||query.version!=="v1"||query.kind!=="graph_query")throw new RetrievalBuilderError("INVALID_GRAPH_QUERY","graph() requires canonical Query IR v1");
    if(Object.hasOwn(query,"tenant_id")||Object.hasOwn(query,"tenantId"))throw new RetrievalBuilderError("TENANT_OVERRIDE","Tenant identity cannot be supplied through retrieval input");
    assertIdentifier(identityField,"identityField");
    if(candidateLimit!==undefined&&(!Number.isInteger(candidateLimit)||candidateLimit<1||candidateLimit>1000))throw new RetrievalBuilderError("INVALID_CANDIDATE_LIMIT","candidateLimit must be an integer between 1 and 1000");
    this.ir.sources.graph={query:clone(query),identity_field:identityField,...(candidateLimit===undefined?{}:{candidate_limit:candidateLimit})};
    return this;
  }
  vector({catalogRef,queryParameter="embedding",topK=10,identityField="id"}={}){
    assertCatalog(catalogRef);
    assertIdentifier(queryParameter,"queryParameter");
    assertIdentifier(identityField,"identityField");
    if(!Number.isInteger(topK)||topK<1||topK>1000)throw new RetrievalBuilderError("INVALID_TOP_K","topK must be an integer between 1 and 1000");
    this.ir.sources.vector={catalog_ref:catalogRef,query_parameter:queryParameter,top_k:topK,identity_field:identityField};
    return this;
  }
  fusion({vectorWeight=1,graphWeight=1}={}){
    assertPositiveNumber(vectorWeight,"vectorWeight");
    assertPositiveNumber(graphWeight,"graphWeight");
    this.ir.fusion={strategy:"weighted_rrf",vector_weight:vectorWeight,graph_weight:graphWeight};
    return this;
  }
  limits({maxResults=20,maxCost=40}={}){
    if(!Number.isInteger(maxResults)||maxResults<1||maxResults>1000)throw new RetrievalBuilderError("INVALID_MAX_RESULTS","maxResults must be an integer between 1 and 1000");
    if(!Number.isInteger(maxCost)||maxCost<1||maxCost>100)throw new RetrievalBuilderError("INVALID_MAX_COST","maxCost must be an integer between 1 and 100");
    this.ir.limits={max_results:maxResults,max_cost:maxCost};
    return this;
  }
  bind(name,type,value,required=true){
    assertIdentifier(name,"Parameter name");
    if(!PARAM_TYPES.has(type))throw new RetrievalBuilderError("INVALID_PARAMETER_TYPE","Unsupported parameter type");
    if(this.ir.sources.vector?.query_parameter===name&&type!=="vector")throw new RetrievalBuilderError("INVALID_PARAMETER_TYPE","Vector retrieval parameters must use type vector");
    if(Object.hasOwn(this.bound,name))throw new RetrievalBuilderError("DUPLICATE_PARAMETER","Parameter names must be unique");
    this.bound[name]=clone(value);
    return this;
  }
  build(){
    try{validateRetrievalIR(this.ir);}catch(error){throw new RetrievalBuilderError(error.code??"INVALID_RETRIEVAL_IR",error.message);}
    return {ir:clone(this.ir),parameters:clone(this.bound)};
  }
  async explain(){
    const built=this.build();
    return this.client.request("retrieval-explain",{ir:built.ir});
  }
  async execute(parameters=undefined){
    const built=this.build();
    return this.client.request("retrieval",{ir:built.ir,parameters:{...built.parameters,...(parameters??{})}});
  }
}

export function createRetrievalBuilder(client){return new RetrievalBuilder(client);}
