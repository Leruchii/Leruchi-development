import {cookies} from "next/headers";
import {NextResponse} from "next/server";

export async function POST(request:Request){
  const base=process.env.LERUCHI_API_URL;
  const token=(await cookies()).get("vibe_access_token")?.value;
  if(!base)return NextResponse.json({error:{code:"STUDIO_API_NOT_CONFIGURED",message:"LERUCHI_API_URL is not configured"}},{status:503});
  if(!token)return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Studio session is not authenticated"}},{status:401});
  const body=await request.json();
  const response=await fetch(base.replace(/\/$/,"")+"/v1/graph/query",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+token},body:JSON.stringify(body),cache:"no-store"});
  const payload=await response.json().catch(()=>({error:{code:"INVALID_UPSTREAM_RESPONSE",message:"Invalid Graph API response"}}));
  return NextResponse.json(payload,{status:response.status});
}
