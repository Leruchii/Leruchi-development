const RRF_K=60;

export class RetrievalFusionError extends Error {
  constructor(code,message,details=undefined){super(message);this.name="RetrievalFusionError";this.code=code;this.details=details;}
}

function weight(value,label){
  const n=value===undefined?1:value;
  if(!Number.isFinite(n)||n<=0) throw new RetrievalFusionError("INVALID_FUSION_WEIGHT",label+" must be positive and finite");
  return n;
}

function rows(value,label){
  if(!Array.isArray(value)) throw new RetrievalFusionError("INVALID_RETRIEVAL_ROWS",label+" results must be an array");
  return value;
}

function candidateId(row,index,label,identityField){
  const id=Array.isArray(row)?row[0]:row?.[identityField];
  if(id===undefined||id===null||id==="") throw new RetrievalFusionError("MISSING_CANDIDATE_ID",label+" result at rank "+(index+1)+" has no candidate identity");
  return String(id);
}

export function fuseWeightedRRF({vectorRows=[],graphRows=[],vectorWeight=1,graphWeight=1,maxResults=20}){
  if(!Number.isInteger(maxResults)||maxResults<1||maxResults>1000) throw new RetrievalFusionError("RETRIEVAL_LIMIT_EXCEEDED","maxResults must be between 1 and 1000");
  const vw=weight(vectorWeight,"vectorWeight");
  const gw=weight(graphWeight,"graphWeight");
  const candidates=new Map();
  const add=(input,label,w,identityField)=>{
    rows(input,label).forEach((row,index)=>{
      const id=candidateId(row,index,label,identityField);
      let item=candidates.get(id);
      if(!item)item={id,score:0,sources:{}};
      item.score+=w/(RRF_K+index+1);
      item.sources[label]={rank:index+1,weight:w};
      if(!item.row||label==="vector")item.row=row;
      candidates.set(id,item);
    });
  };
  add(vectorRows,"vector",vw,"id");
  add(graphRows,"graph",gw,"id");
  return [...candidates.values()]
    .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
    .slice(0,maxResults)
    .map(item=>({id:item.id,score:item.score,sources:item.sources,row:item.row}));
}
