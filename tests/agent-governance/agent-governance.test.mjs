import test from "node:test";
import assert from "node:assert/strict";
import {
  createAgentIdentity,
  createAgentMandate,
  createDelegation,
  authorizeAgentAction,
  revokeGovernanceRecord,
  hashAgentIdentity
} from "../../packages/agent-governance/index.mjs";

test("creates a bounded agent identity with explicit owner", () => {
  const identity = createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", capabilities: ["graph:read", "vector:read"] });
  assert.equal(identity.status, "active");
  assert.equal(identity.owner_id, "principal-1");
  assert.deepEqual(identity.capabilities, ["graph:read", "vector:read"]);
  assert.equal(hashAgentIdentity(identity).length, 64);
});

test("denies revoked agents before execution", () => {
  const identity = revokeGovernanceRecord(createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", capabilities: ["graph:read"] }));
  const decision = authorizeAgentAction({ identity, requiredCapabilities: ["graph:read"] });
  assert.equal(decision.status, "denied");
  assert.equal(decision.reason_code, "AGENT_REVOKED");
  assert.equal(decision.execution, "not_executed");
});

test("requires mandate capability and resource scope", () => {
  const identity = createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", capabilities: ["graph:read"] });
  const mandate = createAgentMandate({
    mandateId: "mandate-1",
    agentId: "agent-1",
    grantorId: "principal-1",
    capabilities: ["graph:read"],
    resources: ["graph:customer"]
  });
  assert.equal(authorizeAgentAction({ identity, mandate, requiredCapabilities: ["graph:read"], resource: "graph:customer" }).status, "allowed");
  assert.equal(authorizeAgentAction({ identity, mandate, requiredCapabilities: ["graph:read"], resource: "graph:billing" }).status, "denied");
});

test("requires delegation capability when delegation is supplied", () => {
  const identity = createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", capabilities: ["graph:read", "vector:read"] });
  const delegation = createDelegation({
    delegationId: "delegation-1",
    fromPrincipalId: "principal-1",
    toAgentId: "agent-1",
    capabilities: ["graph:read"]
  });
  assert.equal(authorizeAgentAction({ identity, delegation, requiredCapabilities: ["graph:read"] }).status, "allowed");
  const denied = authorizeAgentAction({ identity, delegation, requiredCapabilities: ["vector:read"] });
  assert.equal(denied.status, "denied");
  assert.equal(denied.reason_code, "AGENT_DELEGATION_CAPABILITY_DENIED");
});

test("revocation is monotonic and preserves record identity", () => {
  const mandate = createAgentMandate({ mandateId: "mandate-1", agentId: "agent-1", grantorId: "principal-1", capabilities: ["graph:read"] });
  const revoked = revokeGovernanceRecord(mandate);
  assert.equal(revoked.mandate_id, mandate.mandate_id);
  assert.equal(revoked.status, "revoked");
});

test("expired mandates fail closed", () => {
  const identity = createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", capabilities: ["graph:read"] });
  const mandate = createAgentMandate({
    mandateId: "mandate-1",
    agentId: "agent-1",
    grantorId: "principal-1",
    capabilities: ["graph:read"],
    expiresAt: "2020-01-01T00:00:00.000Z"
  });
  const decision = authorizeAgentAction({ identity, mandate, requiredCapabilities: ["graph:read"], now: Date.parse("2026-01-01T00:00:00.000Z") });
  assert.equal(decision.status, "denied");
  assert.equal(decision.reason_code, "AGENT_MANDATE_DENIED");
});

test("does not expose credentials or tenant authority in the decision", () => {
  const identity = createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", capabilities: ["graph:read"] });
  const decision = authorizeAgentAction({ identity, requiredCapabilities: ["graph:read"], resource: "graph:customer" });
  const serialized = JSON.stringify(decision);
  assert.equal(/token|password|tenant_id|tenantId|credential|api[_-]?key|private[_-]?key/i.test(serialized), false);
});

test("rejects structured metadata", () => {
  assert.throws(() => createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", metadata: [] }));
  assert.throws(() => createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", metadata: { nested: { value: true } } }));
});

test("metadata is immutable after identity creation", () => {
  const metadata = { team: "research" };
  const identity = createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", metadata });
  metadata.team = "changed";
  assert.equal(identity.metadata.team, "research");
  assert.equal(Object.isFrozen(identity.metadata), true);
});

test("rejects sensitive metadata keys and plain-object violations", () => {
  assert.throws(() => createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", metadata: { tenant_id: "tenant-a" } }));
  assert.throws(() => createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", metadata: { api_key: "value" } }));
  const custom = Object.create({ inherited: true });
  custom.team = "research";
  assert.throws(() => createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", metadata: custom }));
});

test("authorization decisions never echo resource identifiers", () => {
  const identity = createAgentIdentity({ agentId: "agent-1", ownerId: "principal-1", capabilities: ["graph:read"] });
  const decision = authorizeAgentAction({ identity, requiredCapabilities: ["graph:read"], resource: "tenant_id=private-tenant" });
  assert.equal(decision.status, "allowed");
  assert.equal(JSON.stringify(decision).includes("private-tenant"), false);
});
