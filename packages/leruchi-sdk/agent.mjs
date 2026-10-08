import {VibeClientError} from "./index.mjs";
import {CrossModalPlanBuilder} from "./plan.mjs";
const ACTIONS=new Set(["query","retrieval","context","mutation"]);
export class AgentIntentBuilder{
  constructor(client,action,ir){
    if(!ACTIONS.has(action))throw new VibeClientError("INVALID_AGENT_INTENT_ACTION","Unsupported Agent Intent action");
    if(!ir||typeof ir!=="object"||Array.isArray(ir))throw new VibeClientError("INVALID_AGENT_INTENT_IR","A canonical Leruchi IR is required");
    this.client=client;this.intent={version:"v1",kind:"agent_intent",action,ir:JSON.parse(JSON.stringify(ir))};
  }
  bindings(value){if(!value||typeof value!=="object")throw new VibeClientError("INVALID_AGENT_INTENT_BINDINGS","Bindings must be an object or Context binding array");this.intent.bindings=JSON.parse(JSON.stringify(value));return this;}
  build(){return {intent:JSON.parse(JSON.stringify(this.intent))};}
  async explain(){return this.client.request("agent-intent-explain",this.build());}
}
export function createAgentSurface(client){return {intent(action,ir){return new AgentIntentBuilder(client,action,ir);},plan(){return new CrossModalPlanBuilder(client);},trace(input){if(!input||typeof input!=="object")throw new VibeClientError("INVALID_AGENT_TRACE","Trace input must be an object");return {build(){return JSON.parse(JSON.stringify(input));},async create(){return client.request("agent-trace",JSON.parse(JSON.stringify(input)));}};},replay(trace){if(!trace||typeof trace!=="object")throw new VibeClientError("INVALID_AGENT_TRACE","A trace object is required");return {build(){return {trace:JSON.parse(JSON.stringify(trace))};},async run(){return client.request("agent-replay",{trace:JSON.parse(JSON.stringify(trace))});}};},evaluate(cases){if(!Array.isArray(cases)||!cases.length)throw new VibeClientError("INVALID_EVALUATION_CASES","At least one evaluation case is required");return {build(){return {cases:JSON.parse(JSON.stringify(cases))};},async run(){return client.request("agent-evaluate",{cases:JSON.parse(JSON.stringify(cases))});}};}};}
