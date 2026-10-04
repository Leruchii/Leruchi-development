export type Catalog={version:"v1";graphs:Record<string,{visibility:"shared"|"tenant";tenantId:string|null;labels:string[];edges:Array<{name:string;from:string|null;to:string|null;properties:Record<string,unknown>}>}>};

export type GraphResult={version:"v1";request_id:string;columns:string[];rows:Record<string,unknown>[];count:number};

export class VibeApiError extends Error{
  constructor(public code:string,public requestId?:string,message="Vibe API request failed"){super(message);this.name="VibeApiError";}
}

async function request<T>(baseUrl:string,path:string,token:string,init:RequestInit={}):Promise<T>{
  const response=await fetch(new URL(path,baseUrl),{
    ...init,
    headers:{"content-type":"application/json",authorization:`Bearer ${token}`,...(init.headers??{})}
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=payload?.error;
    throw new VibeApiError(error?.code??"HTTP_ERROR",error?.request_id,error?.message??"Vibe API request failed");
  }
  return payload as T;
}

export function createVibeApiClient({baseUrl,token}:{baseUrl:string;token:string}){
  return {
    catalog:()=>request<Catalog>(baseUrl,"/v1/schema/catalog",token),
    query:(ir:Record<string,unknown>,parameters:Record<string,unknown>={})=>
      request<GraphResult>(baseUrl,"/v1/graph/query",token,{method:"POST",body:JSON.stringify({ir,parameters})}),
    mutation:(ir:Record<string,unknown>,parameters:Record<string,unknown>={})=>
      request<GraphResult>(baseUrl,"/v1/graph/mutation",token,{method:"POST",body:JSON.stringify({ir,parameters})})
  };
}
