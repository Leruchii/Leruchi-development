import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createPublicKey, verify } from "node:crypto";
import { createCapabilityControlPlane } from "../../packages/capability-control-plane/service.mjs";

function fixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const grants = new Map();
  const store = {
    async createGrant(value) { grants.set(value.jti, { ...value, expiresAt: value.expiresAt, revokedAt: null }); },
    async getGrant(jti) { return grants.get(jti) ?? null; },
    async revokeGrant(jti, at) { const grant = grants.get(jti); if (!grant) return false; grant.revokedAt ??= at; return true; },
  };
  const service = createCapabilityControlPlane({
    issuer: "test-issuer", keyId: "test-key", privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
    internalBearerToken: "internal-test-token", store, clock: () => 1000,
    authenticateCaller: async (req) => req.headers["x-test-auth"] === "valid" ? { subject: "trusted-subject", tenantIds: ["tenant-a"] } : null,
    authorizeGrant: async (_principal, request) => request.tenant_id === "tenant-a" && request.capabilities.every((c) => c !== "graph:delete"),
  });
  return { service, store, publicKey };
}

function request(method, url, { headers = {}, body } = {}) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
  return { method, url, headers, async *[Symbol.asyncIterator]() { yield* chunks; } };
}
function response() {
  return { status: 0, headers: {}, writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = JSON.parse(body); } };
}

test("issuer derives subject from trusted identity, enforces tenant/policy and signs a short-lived grant", async () => {
  const { service, store, publicKey } = fixture();
  const req = request("POST", "/v1/capability-grants", { headers: { "x-test-auth": "valid" }, body: { tenant_id: "tenant-a", capabilities: ["graph:read"], ttl_seconds: 60, sub: "attacker", exp: 999999 } });
  const res = response();
  await service.handle(req, res);
  assert.equal(res.status, 201);
  assert.equal(res.body.grant.sub, "trusted-subject");
  assert.notEqual(res.body.grant.sub, "attacker");
  assert.equal(res.body.grant.exp, 1060);
  assert.equal((await store.getGrant(res.body.grant.jti)).expiresAt, 1060);
  const [header, payload, signature] = res.body.token.split(".");
  assert.equal(JSON.parse(Buffer.from(header, "base64url")).kid, "test-key");
  assert.equal(verify(null, Buffer.from(header + "." + payload), createPublicKey(publicKey), Buffer.from(signature, "base64url")), true);
});

test("issuer denies unauthenticated, cross-tenant, disallowed capabilities and excessive TTL", async () => {
  const { service } = fixture();
  for (const item of [
    { headers: {}, body: { tenant_id: "tenant-a", capabilities: ["graph:read"] }, status: 401 },
    { headers: { "x-test-auth": "valid" }, body: { tenant_id: "tenant-b", capabilities: ["graph:read"] }, status: 403 },
    { headers: { "x-test-auth": "valid" }, body: { tenant_id: "tenant-a", capabilities: ["graph:delete"] }, status: 403 },
    { headers: { "x-test-auth": "valid" }, body: { tenant_id: "tenant-a", capabilities: ["admin:all"] }, status: 400 },
    { headers: { "x-test-auth": "valid" }, body: { tenant_id: "tenant-a", capabilities: ["graph:read"], ttl_seconds: 901 }, status: 400 },
  ]) {
    const res = response();
    await service.handle(request("POST", "/v1/capability-grants", item), res);
    assert.equal(res.status, item.status);
  }
});

test("revocation endpoints are internal-only, persistent and fail closed for unknown grants", async () => {
  const { service } = fixture();
  const issued = response();
  await service.handle(request("POST", "/v1/capability-grants", { headers: { "x-test-auth": "valid" }, body: { tenant_id: "tenant-a", capabilities: ["graph:read"] } }), issued);
  const jti = issued.body.grant.jti;
  const denied = response();
  await service.handle(request("GET", `/v1/capability-grants/${jti}/revocation`), denied);
  assert.equal(denied.status, 401);
  const lookup = response();
  await service.handle(request("GET", `/v1/capability-grants/${jti}/revocation`, { headers: { authorization: "Bearer internal-test-token" } }), lookup);
  assert.deepEqual(lookup.body, { active: true, revoked: false });
  const revoked = response();
  await service.handle(request("POST", `/v1/capability-grants/${jti}/revoke`, { headers: { authorization: "Bearer internal-test-token" } }), revoked);
  assert.equal(revoked.status, 200);
  const after = response();
  await service.handle(request("GET", `/v1/capability-grants/${jti}/revocation`, { headers: { authorization: "Bearer internal-test-token" } }), after);
  assert.deepEqual(after.body, { active: true, revoked: true });
  const unknown = response();
  await service.handle(request("GET", "/v1/capability-grants/unknown/revocation", { headers: { authorization: "Bearer internal-test-token" } }), unknown);
  assert.deepEqual(unknown.body, { active: false, revoked: true });
});

test("issuer rejects oversized request bodies", async () => {
  const { service } = fixture();
  const req = { method: "POST", url: "/v1/capability-grants", headers: { "x-test-auth": "valid" }, async *[Symbol.asyncIterator]() { yield Buffer.alloc(17000, 65); } };
  const res = response();
  await service.handle(req, res);
  assert.equal(res.status, 413);
});
