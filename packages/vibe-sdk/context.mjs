import {VibeClientError} from "./index.mjs";

export class ContextBuilder {
  constructor(client){this.client=client;this.ir={version:"v1",kind:"context_request",purpose:"",sources:[],budget:{max_items:100,max_bytes:65536},freshness:{mode:"current"},output:{format:"structured",include_provenance:false,deduplicate:true}};}
  purpose(value){if(typeof value!=="string"||value.length<1||value.length>500)throw new VibeClientError("INVALID_CONTEXT_PURPOSE","Purpose must be 1-500 characters");this.ir.purpose=value;return this;}
  source(source){if(!source||typeof source!=="object"||Array.isArray(source))throw new VibeClientError("INVALID_CONTEXT_SOURCE","Source must be an object");if(Object.hasOwn(source,"tenant_id")||Object.hasOwn(source,"tenantId")||Object.hasOwn(source,"authorization")||Object.hasOwn(source,"access_token"))throw new VibeClientError("INVALID_CONTEXT_SOURCE","Tenant identity and credentials cannot be supplied");this.ir.sources.push(JSON.parse(JSON.stringify(source)));return this;}
  budget({maxItems=100,maxBytes=65536}={}){this.ir.budget={max_items:maxItems,max_bytes:maxBytes};return this;}
  freshness(mode,maxAgeSeconds){this.ir.freshness=mode==="bounded_stale"?{mode,max_age_seconds:maxAgeSeconds}:{mode};return this;}
  output(options={}){this.ir.output={...this.ir.output,...options};return this;}
  build(){if(!this.ir.purpose)throw new VibeClientError("INVALID_CONTEXT_PURPOSE","Call purpose() before executing");if(!this.ir.sources.length)throw new VibeClientError("INVALID_CONTEXT_SOURCE","At least one source is required");return {ir:JSON.parse(JSON.stringify(this.ir))};}
  async explain(){return this.client.request("context-explain",this.build());}
}
export function createContextBuilder(client){return new ContextBuilder(client);}
