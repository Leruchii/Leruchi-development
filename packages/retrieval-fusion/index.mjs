import {assertCandidateSet} from "../retrieval-contract/index.mjs";

const RRF_K=60;

export class RetrievalFusionError extends Error {
  constructor(code,message,details=undefined){super(message);this.name="RetrievalFusionError";this.code=code;this.details=details;}
}

function weight(value,label){
  const n=value===undefined?1:value;
  if(!Number.isFinite(n)||n<=0) throw new RetrievalFusionError("INVALID_FUSION_WEIGHT",label+" must be positive and finite");
  return n;
}

export function fuseWeightedRRF({vectorCandidates=[],graphCandidates=[],vectorWeight=1,graphWeight=1,maxResults=20}){
  if(!Number.isInteger(maxResults)||maxResults<1||maxResults>1000) throw new RetrievalFusionError("RETRIEVAL_LIMIT_EXCEEDED","maxResults must be between 1 and 1000");
  const vw=weight(vectorWeight,"vectorWeight");
  const gw=weight(graphWeight,"graphWeight");
  const candidates=new Map();
  const add=(input,source,w)=>{
    assertCandidateSet(input,source).forEach(candidate=>{
      if(candidate?.source!==source||typeof candidate?.candidate_id!=="string"||candidate.candidate_id===""){
        throw new RetrievalFusionError("INVALID_CANDIDATE","Candidates must use the canonical retrieval result contract");
      }
      if(!Number.isInteger(candidate.rank)||candidate.rank<1) throw new RetrievalFusionError("INVALID_CANDIDATE_RANK",source+" candidate rank must be a positive integer");
      const id=candidate.candidate_id;
      let item=candidates.get(id);
      if(!item)item={candidate_id:id,score:0,sources:{},payload:candidate.payload};
      item.score+=w/(RRF_K+candidate.rank);
      item.sources[source]={rank:candidate.rank,weight:w};
      if(source==="vector") item.payload=candidate.payload;
      candidates.set(id,item);
    });
  };
  add(vectorCandidates,"vector",vw);
  add(graphCandidates,"graph",gw);
  return [...candidates.values()]
    .sort((a,b)=>b.score-a.score||a.candidate_id.localeCompare(b.candidate_id))
    .slice(0,maxResults)
    .map(item=>({candidate_id:item.candidate_id,score:item.score,sources:item.sources,payload:item.payload}));
}
