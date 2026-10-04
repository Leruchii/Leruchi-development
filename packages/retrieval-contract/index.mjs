export class RetrievalContractError extends Error {
  constructor(code,message,details=undefined){super(message);this.name="RetrievalContractError";this.code=code;this.details=details;}
}

const IDENTIFIER=/^[A-Za-z_][A-Za-z0-9_]*$/;

function requireIdentifier(value,label){
  if(typeof value!=="string"||!IDENTIFIER.test(value)) throw new RetrievalContractError("INVALID_IDENTITY_FIELD",label+" must be a safe identifier");
  return value;
}

export function normalizeRetrievalRows({rows,columns,identityField,source}){
  if(!Array.isArray(rows)) throw new RetrievalContractError("INVALID_RETRIEVAL_ROWS",source+" results must be an array");
  if(!Array.isArray(columns)||columns.some(column=>typeof column!=="string")) throw new RetrievalContractError("INVALID_RETRIEVAL_COLUMNS","Retrieval columns must be an array of strings");
  const identity=requireIdentifier(identityField,"identityField");
  const identityIndex=columns.indexOf(identity);
  if(identityIndex<0) throw new RetrievalContractError("IDENTITY_FIELD_NOT_PROJECTED",source+" results do not project the requested identity field");
  return rows.map((row,index)=>{
    const values=Array.isArray(row)?row:Object.fromEntries(columns.map((column,i)=>[column,row?.[column]]));
    const candidateId=Array.isArray(row)?row[identityIndex]:row?.[identity];
    if(candidateId===undefined||candidateId===null||candidateId==="") throw new RetrievalContractError("MISSING_CANDIDATE_ID",source+" result at rank "+(index+1)+" has no candidate identity");
    return {
      candidate_id:String(candidateId),
      source,
      rank:index+1,
      payload:values
    };
  });
}

export function assertCandidateSet(candidates,source){
  if(!Array.isArray(candidates)) throw new RetrievalContractError("INVALID_CANDIDATE_SET",source+" candidates must be an array");
  return candidates;
}
