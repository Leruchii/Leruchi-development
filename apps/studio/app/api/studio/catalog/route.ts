import {cookies} from "next/headers";
import {NextResponse} from "next/server";

const upstreamError=(code:string,message:string,status:number)=>NextResponse.json(
  {error:{code,message}},
  {status,headers:{"cache-control":"no-store"}}
);

export async function GET(){
  const base=process.env.LERUCHI_API_URL??process.env.VIBE_API_URL;
  const cookieStore=await cookies();
  const token=cookieStore.get("leruchi_access_token")?.value??cookieStore.get("vibe_access_token")?.value;
  if(!base)return NextResponse.json({error:{code:"STUDIO_API_NOT_CONFIGURED",message:"LERUCHI_API_URL is not configured (legacy VIBE_API_URL is supported)"}},{status:503,headers:{"cache-control":"no-store"}});
  if(!token)return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Studio session is not authenticated"}},{status:401,headers:{"cache-control":"no-store"}});

  let response:Response;
  try {
    response=await fetch(base.replace(/\/$/,"")+"/v1/schema/catalog",{
      headers:{authorization:"Bearer "+token},
      cache:"no-store",
      signal:AbortSignal.timeout(10_000)
    });
  } catch (error) {
    if(error instanceof Error&&error.name==="TimeoutError") {
      return upstreamError("GRAPH_API_TIMEOUT","Graph API did not respond in time",504);
    }
    return upstreamError("GRAPH_API_UNAVAILABLE","Could not reach the Graph API",502);
  }

  const payload=await response.json().catch(()=>({error:{code:"INVALID_UPSTREAM_RESPONSE",message:"Invalid Graph API response"}}));
  return NextResponse.json(payload,{status:response.status,headers:{"cache-control":"no-store"}});
}
