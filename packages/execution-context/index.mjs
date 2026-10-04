export class ExecutionContextError extends Error {
  constructor(code, message) { super(message); this.name = "ExecutionContextError"; this.code = code; }
}
function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new ExecutionContextError("INVALID_EXECUTION_CONTEXT", name + " is required");
  return value;
}
export function createExecutionContext(claims, {requestId} = {}) {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) throw new ExecutionContextError("INVALID_EXECUTION_CONTEXT", "Verified claims are required");
  const tenantId = requiredString(claims.tenant_id, "tenant_id");
  const role = typeof claims.role === "string" && claims.role.trim() ? claims.role : "authenticated";
  const capabilities = Array.isArray(claims.capabilities) ? [...new Set(claims.capabilities.filter(value => typeof value === "string" && value.trim()))] : [];
  return Object.freeze({trusted:true,tenantId,role,capabilities:Object.freeze(capabilities),trustedBackend:claims.trusted_backend===true,requestId:requestId??null});
}
export function assertTrustedExecutionContext(context) {
  if (!context || context.trusted !== true) throw new ExecutionContextError("UNTRUSTED_CONTEXT", "Trusted execution context is required");
  requiredString(context.tenantId, "tenantId");
  return context;
}
export function postgresRequestClaims(context) {
  assertTrustedExecutionContext(context);
  return {tenant_id:context.tenantId,role:context.role??"authenticated",capabilities:Array.isArray(context.capabilities)?context.capabilities:[]};
}
