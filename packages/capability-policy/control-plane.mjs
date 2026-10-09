export function createControlPlaneRevocationVerifier({baseUrl,bearerToken,fetchImpl=globalThis.fetch,timeoutMs=2000}={}){
  if(typeof baseUrl!=="string"||!baseUrl.trim())throw new Error("Capability control-plane URL is required");
  if(typeof bearerToken!=="string"||!bearerToken.trim())throw new Error("Capability control-plane bearer token is required");
  if(typeof fetchImpl!=="function")throw new Error("fetch implementation is required");
  const base=new URL(baseUrl);
  const localHost=["localhost","127.0.0.1","::1"].includes(base.hostname);
  if(base.protocol!=="https:"&&!(base.protocol==="http:"&&localHost))throw new Error("Capability control-plane URL must use HTTPS outside loopback");
  if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>10000)throw new Error("Invalid capability control-plane timeout");
  return async function isCapabilityGrantRevoked(jti){
    if(typeof jti!=="string"||!jti.trim())throw new Error("Capability grant jti is required");
    const endpoint=new URL("/v1/capability-grants/"+encodeURIComponent(jti)+"/revocation",base);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetchImpl(endpoint,{method:"GET",headers:{authorization:"Bearer "+bearerToken,accept:"application/json"},signal:controller.signal,cache:"no-store"});
      if(!response.ok)throw new Error("Control-plane revocation lookup failed");
      const decision=await response.json();
      if(!decision||typeof decision.active!=="boolean"||typeof decision.revoked!=="boolean")throw new Error("Invalid control-plane revocation response");
      if(decision.active!==true)return true;
      return decision.revoked || !decision.active;
    }catch{
      const error=new Error("Capability revocation decision unavailable");
      error.code="CAPABILITY_REVOCATION_UNAVAILABLE";
      throw error;
    }finally{clearTimeout(timer);}
  };
}
