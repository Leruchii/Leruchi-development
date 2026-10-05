import {VibeClientError} from "./index.mjs";

const ACTIONS=new Set(["query","retrieval","context","mutation"]);

export class AgentIntentBuilder{
  constructor(client,action,ir){
    if(!ACTIONS.has(action))throw new VibeClientError("INVALID_AGENT_INTENT_ACTION","Unsupported Agent Intent action");
    if(!ir||typeof ir!=="object"||Array.isArray(ir))throw new VibeClientError("INVALID_AGENT_INTENT_IR","A canonical VibeDB IR is required");
    this.client=client;
    this.intent={version:"v1",kind:"agent_intent",action,ir:JSON.parse(JSON.stringify(ir))};
  }
  bindings(value){
    if(!value||typeof value!=="object")throw new VibeClientError("INVALID_AGENT_INTENT_BINDINGS","Bindings must be an object or Context binding array");
    this.intent.bindings=JSON.parse(JSON.stringify(value));
    return this;
  }
  build(){return {intent:JSON.parse(JSON.stringify(this.intent))};}
  async explain(){return this.client.request("agent-intent-explain",this.build());}
}

export function createAgentSurface(client){
  return {
    intent(action,ir){return new AgentIntentBuilder(client,action,ir);}
  };
}
