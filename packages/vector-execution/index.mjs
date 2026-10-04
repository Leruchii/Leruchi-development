import {randomUUID} from "node:crypto";
import {assertTrustedExecutionContext} from "../execution-context/index.mjs";

const IDENTIFIER=/^[A-Za-z_][A-Za-z0-9_]*$/;
const CATALOG_REF=/^[A-Za-z_][A-Za-z0-9_.]*$/;
const METRICS={
  cosine:{operator:"<=>"},
  inner_product:{operator:"<#>"},
  l2:{operator:"<->"}
};

export class VectorExecutionError extends Error {
  constructor(code,message,details=undefined){super(message);this.name="VectorExecutionError";this.code=code;this.details=details;}
}

function identifier(value,label){
  if(typeof value!=="string"||!IDENTIFIER.test(value)) throw new VectorExecutionError("INVALID_CATALOG_METADATA",`Invalid ${label} in vector catalog`);
  return `"${value}"`;
}

function vectorLiteral(value,dimensions){
  if(!Array.isArray(value)||value.length!==dimensions||!value.every(n=>Number.isFinite(n))){
    throw new VectorExecutionError("VECTOR_DIMENSION_MISMATCH","Query embedding does not match catalog dimensions",{expected:dimensions,actual:Array.isArray(value)?value.length:null});
  }
  return "["+value.join(",")+"]";
}

export function resolveVectorCatalog(catalog,catalogRef){
  if(typeof catalogRef!=="string"||!CATALOG_REF.test(catalogRef)) throw new VectorExecutionError("INVALID_CATALOG_REF","Invalid vector catalog reference");
  const entry=catalog?.vectors?.[catalogRef];
  if(!entry) throw new VectorExecutionError("VECTOR_SOURCE_NOT_FOUND","Vector source is not visible in the Schema Catalog");
  const metric=METRICS[entry.distanceMetric];
  if(!metric) throw new VectorExecutionError("UNSUPPORTED_DISTANCE_METRIC","Unsupported vector distance metric");
  return {
    ...entry,
    schemaName:identifier(entry.schemaName??catalogRef.split(".")[0],"schema"),
    relationName:identifier(entry.relationName??catalogRef.split(".")[1],"relation"),
    embeddingColumn:identifier(entry.embeddingColumn??"embedding","embedding column"),
    keyColumn:identifier(entry.keyColumn,"key column"),
    contentColumn:entry.contentColumn?identifier(entry.contentColumn,"content column"):null,
    operator:metric.operator
  };
}

export function compileVectorRetrieval({catalog,catalogRef,embedding,topK,maxResults=1000,maxCost=100}){
  const source=resolveVectorCatalog(catalog,catalogRef);
  if(!Number.isInteger(topK)||topK<1||topK>1000) throw new VectorExecutionError("INVALID_LIMIT","top_k must be between 1 and 1000");
  if(topK>maxResults||topK>maxCost) throw new VectorExecutionError("COST_LIMIT_EXCEEDED","Vector retrieval exceeds the request budget",{top_k:topK,max_results:maxResults,max_cost:maxCost});
  const vector=vectorLiteral(embedding,source.dimensions);
  const distance=`${source.embeddingColumn} ${source.operator} $1::vector`;
  const columns=[`${source.keyColumn} AS id`];
  if(source.contentColumn) columns.push(`${source.contentColumn} AS content`);
  columns.push(`${distance} AS distance`);
  return {
    sql:`SELECT ${columns.join(", ")} FROM ${source.schemaName}.${source.relationName} ORDER BY ${distance} LIMIT $2`,
    values:[vector,topK],
    columns:["id",...(source.contentColumn?["content"]:[]),"distance"],
    catalog_ref:catalogRef
  };
}

export async function executeVectorRetrieval({catalog,catalogRef,embedding,topK,maxResults,maxCost,context,db,requestId=randomUUID()}){
  try{assertTrustedExecutionContext(context);}catch{throw new VectorExecutionError("UNTRUSTED_CONTEXT","Trusted execution context is required");}
  const compiled=compileVectorRetrieval({catalog,catalogRef,embedding,topK,maxResults,maxCost});
  let began=false;
  try{
    await db.begin(); began=true;
    const result=await db.executeBound(compiled);
    await db.commit(); began=false;
    return {version:"v1",request_id:requestId,catalog_ref:catalogRef,columns:compiled.columns,rows:result.rows??[],count:Array.isArray(result.rows)?result.rows.length:0};
  }catch(error){
    if(began){try{await db.rollback();}catch{}}
    if(error instanceof VectorExecutionError) throw error;
    throw new VectorExecutionError("DATABASE_EXECUTION_FAILED","Vector retrieval execution failed");
  }
}
