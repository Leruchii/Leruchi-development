import {VibeClientError} from "./index.mjs";
export class CrossModalPlanBuilder{
  constructor(client){this.client=client;this.plan={version:"v1",kind:"cross_modal_plan",steps:[]};}
  budget(maxItems,maxBytes){if(!Number.isInteger(maxItems)||!Number.isInteger(maxBytes))throw new VibeClientError("INVALID_PLAN_BUDGET","Plan budget must be integers");this.plan.budget={max_items:maxItems,max_bytes:maxBytes};return this;}
  step(id,type,ir,dependsOn=[]){if(typeof id!=="string"||!id||!["query","retrieval","context","mutation"].includes(type))throw new VibeClientError("INVALID_PLAN_STEP","Step id and supported type are required");if(!ir||typeof ir!=="object")throw new VibeClientError("INVALID_PLAN_STEP","Canonical IR is required");this.plan.steps.push({id,type,ir:JSON.parse(JSON.stringify(ir)),...(dependsOn.length?{depends_on:[...dependsOn]}:{})});return this;}
  build(){if(!this.plan.steps.length)throw new VibeClientError("EMPTY_PLAN","At least one plan step is required");return {plan:JSON.parse(JSON.stringify(this.plan))};}
  async explain(){return this.client.request("cross-modal-plan-explain",this.build());}
}
export function createCrossModalPlanBuilder(client){return new CrossModalPlanBuilder(client);}
