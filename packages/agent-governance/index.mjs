import { createHash } from "node:crypto";

const MAX_CAPABILITIES = 64;
const MAX_DELEGATIONS = 32;
const MAX_MANDATES = 64;
const MAX_METADATA_KEYS = 32;
const METADATA_KEY = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/;
const NAME = /^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/;

export class AgentGovernanceError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "AgentGovernanceError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new AgentGovernanceError(code, message, details);
}

function requiredId(value, name) {
  if (typeof value !== "string" || !NAME.test(value)) fail("INVALID_AGENT_GOVERNANCE_ID", `${name} must be a bounded identifier`);
  return value;
}

function boundedString(value, name) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) fail("INVALID_AGENT_GOVERNANCE_VALUE", `${name} must be a bounded non-empty string`);
  return value;
}

function uniqueStrings(values, name, max) {
  if (!Array.isArray(values) || values.length > max || values.some(value => typeof value !== "string" || value.length === 0 || value.length > 128)) {
    fail("INVALID_AGENT_GOVERNANCE_LIST", `${name} must contain bounded strings`);
  }
  return [...new Set(values)];
}

function validateMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)
    || (Object.getPrototypeOf(metadata) !== Object.prototype && Object.getPrototypeOf(metadata) !== null)) {
    fail("INVALID_AGENT_METADATA", "metadata must be a plain object");
  }
  const entries = Object.entries(metadata);
  if (entries.length > MAX_METADATA_KEYS) fail("INVALID_AGENT_METADATA", "metadata contains too many fields");
  const normalized = Object.create(null);
  for (const [key, value] of entries) {
    if (!METADATA_KEY.test(key)) fail("INVALID_AGENT_METADATA", "metadata contains an invalid key");
    if (typeof value === "string") {
      if (value.length > 256) fail("INVALID_AGENT_METADATA", "metadata string values must be bounded");
    } else if (value !== null && typeof value !== "boolean" && !(typeof value === "number" && Number.isFinite(value))) {
      fail("INVALID_AGENT_METADATA", "metadata values must be scalar JSON values");
    }
    normalized[key] = value;
  }
  return Object.freeze(normalized);
}
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  return JSON.stringify(value);
}

export function canonicalizeAgentIdentity(identity) {
  validateAgentIdentity(identity);
  return canonical(identity);
}

export function hashAgentIdentity(identity) {
  return createHash("sha256").update(canonicalizeAgentIdentity(identity)).digest("hex");
}

export function validateAgentIdentity(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) fail("INVALID_AGENT_IDENTITY", "Agent identity must be an object");
  if (identity.version !== "v1" || identity.kind !== "agent_identity") fail("INVALID_AGENT_IDENTITY", "Unsupported agent identity version or kind");
  requiredId(identity.agent_id, "agent_id");
  requiredId(identity.owner_id, "owner_id");
  if (identity.status !== "active" && identity.status !== "revoked") fail("INVALID_AGENT_IDENTITY", "Agent identity status must be active or revoked");
  uniqueStrings(identity.capabilities ?? [], "capabilities", MAX_CAPABILITIES);
  validateMetadata(identity.metadata ?? {});
  return identity;
}

export function createAgentIdentity({ agentId, ownerId, capabilities = [], status = "active", metadata = {} } = {}) {
  const identity = Object.freeze({
    version: "v1",
    kind: "agent_identity",
    agent_id: requiredId(agentId, "agentId"),
    owner_id: requiredId(ownerId, "ownerId"),
    status,
    capabilities: Object.freeze(uniqueStrings(capabilities, "capabilities", MAX_CAPABILITIES)),
    metadata: validateMetadata(metadata)
  });
  validateAgentIdentity(identity);
  return identity;
}

export function createAgentMandate({ mandateId, agentId, grantorId, capabilities = [], resources = [], expiresAt = null, status = "active" } = {}) {
  const mandate = Object.freeze({
    version: "v1",
    kind: "agent_mandate",
    mandate_id: requiredId(mandateId, "mandateId"),
    agent_id: requiredId(agentId, "agentId"),
    grantor_id: requiredId(grantorId, "grantorId"),
    capabilities: Object.freeze(uniqueStrings(capabilities, "capabilities", MAX_CAPABILITIES)),
    resources: Object.freeze(uniqueStrings(resources, "resources", MAX_CAPABILITIES)),
    expires_at: expiresAt,
    status
  });
  if (status !== "active" && status !== "revoked" && status !== "expired") fail("INVALID_AGENT_MANDATE", "Mandate status is invalid");
  if (expiresAt !== null && (typeof expiresAt !== "string" || Number.isNaN(Date.parse(expiresAt)))) fail("INVALID_AGENT_MANDATE", "expiresAt must be null or an ISO date");
  return mandate;
}

export function createDelegation({ delegationId, fromPrincipalId, toAgentId, capabilities = [], resources = [], status = "active" } = {}) {
  const delegation = Object.freeze({
    version: "v1",
    kind: "agent_delegation",
    delegation_id: requiredId(delegationId, "delegationId"),
    from_principal_id: requiredId(fromPrincipalId, "fromPrincipalId"),
    to_agent_id: requiredId(toAgentId, "toAgentId"),
    capabilities: Object.freeze(uniqueStrings(capabilities, "capabilities", MAX_CAPABILITIES)),
    resources: Object.freeze(uniqueStrings(resources, "resources", MAX_CAPABILITIES)),
    status
  });
  if (status !== "active" && status !== "revoked") fail("INVALID_AGENT_DELEGATION", "Delegation status is invalid");
  return delegation;
}

export function revokeGovernanceRecord(record) {
  if (!record || typeof record !== "object") fail("INVALID_GOVERNANCE_RECORD", "Governance record is required");
  if (![ "agent_identity", "agent_mandate", "agent_delegation" ].includes(record.kind)) fail("INVALID_GOVERNANCE_RECORD", "Unsupported governance record");
  return Object.freeze({ ...record, status: "revoked" });
}

function activeAt(record, now) {
  if (record.status === "revoked" || record.status === "expired") return false;
  if (record.expires_at && Date.parse(record.expires_at) <= now) return false;
  return true;
}

function hasAll(granted, required) {
  const set = new Set(granted);
  return required.every(value => set.has(value));
}

export function authorizeAgentAction({ identity, mandate, delegation = null, requiredCapabilities = [], resource = null, now = Date.now() } = {}) {
  try {
    validateAgentIdentity(identity);
    const required = uniqueStrings(requiredCapabilities, "requiredCapabilities", MAX_CAPABILITIES);
    if (identity.status !== "active") fail("AGENT_REVOKED", "Agent identity is revoked");
    if (!hasAll(identity.capabilities, required)) fail("AGENT_CAPABILITY_DENIED", "Agent identity lacks a required capability");

    if (mandate) {
      if (mandate.agent_id !== identity.agent_id || !activeAt(mandate, now)) fail("AGENT_MANDATE_DENIED", "Agent mandate is not active for this agent");
      if (!hasAll(mandate.capabilities, required)) fail("AGENT_MANDATE_CAPABILITY_DENIED", "Agent mandate does not grant the required capability");
      if (resource && mandate.resources.length > 0 && !mandate.resources.includes(resource)) fail("AGENT_RESOURCE_DENIED", "Agent mandate does not cover the requested resource");
    }

    if (delegation) {
      if (delegation.to_agent_id !== identity.agent_id || delegation.status !== "active") fail("AGENT_DELEGATION_DENIED", "Agent delegation is not active for this agent");
      if (!hasAll(delegation.capabilities, required)) fail("AGENT_DELEGATION_CAPABILITY_DENIED", "Agent delegation does not grant the required capability");
      if (resource && delegation.resources.length > 0 && !delegation.resources.includes(resource)) fail("AGENT_RESOURCE_DENIED", "Agent delegation does not cover the requested resource");
    }

    return Object.freeze({
      version: "v1",
      kind: "agent_authorization_decision",
      status: "allowed",
      reason_code: "AGENT_AUTHORIZED",
      agent_id: identity.agent_id,
      required_capabilities: Object.freeze(required),
      resource: resource ?? null,
      execution: "not_executed"
    });
  } catch (error) {
    return Object.freeze({
      version: "v1",
      kind: "agent_authorization_decision",
      status: "denied",
      reason_code: error.code ?? "AGENT_AUTHORIZATION_DENIED",
      execution: "not_executed"
    });
  }
}

export function validateGovernanceSet({ delegations = [], mandates = [] } = {}) {
  if (!Array.isArray(delegations) || delegations.length > MAX_DELEGATIONS) fail("GOVERNANCE_SET_LIMIT_EXCEEDED", "Too many delegations");
  if (!Array.isArray(mandates) || mandates.length > MAX_MANDATES) fail("GOVERNANCE_SET_LIMIT_EXCEEDED", "Too many mandates");
  return Object.freeze({ delegations: Object.freeze([...delegations]), mandates: Object.freeze([...mandates]) });
}

export const AGENT_GOVERNANCE_LIMITS = Object.freeze({
  maxCapabilities: MAX_CAPABILITIES,
  maxDelegations: MAX_DELEGATIONS,
  maxMandates: MAX_MANDATES
});
