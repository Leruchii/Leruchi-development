import { createPrivateKey, sign, timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";

const ALLOWED_CAPABILITIES = new Set(["graph:read", "graph:write", "graph:delete", "vector:read"]);
const MAX_TTL_SECONDS = 15 * 60;
const MAX_BODY_BYTES = 16 * 1024;

function problem(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function hasInternalAuthorization(req, token) {
  const provided = req.headers.authorization;
  if (typeof provided !== "string") return false;
  const expected = "Bearer " + token;
  const actualBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function signGrant(claims, { privateKey, keyId }) {
  const header = b64url(JSON.stringify({ alg: "EdDSA", typ: "JWT", kid: keyId }));
  const payload = b64url(JSON.stringify(claims));
  const signingInput = header + "." + payload;
  const signature = sign(null, Buffer.from(signingInput), createPrivateKey(privateKey)).toString("base64url");
  return signingInput + "." + signature;
}

/**
 * Create the HTTP adapter for a capability control plane.
 *
 * authenticateCaller(req) MUST validate an upstream identity token or a trusted
 * gateway assertion and return { subject, tenantIds }. It must not trust
 * subject/tenant identity from the request body.
 *
 * authorizeGrant(principal, request) MUST enforce current tenant membership,
 * capability policy and any approval requirement. Both callbacks are mandatory.
 * store must be backed by durable storage in production.
 */
export function createCapabilityControlPlane({
  issuer,
  audience = "leruchi",
  keyId,
  privateKey,
  internalBearerToken,
  store,
  authenticateCaller,
  authorizeGrant,
  clock = () => Math.floor(Date.now() / 1000),
}) {
  if (typeof issuer !== "string" || !issuer.trim() || typeof audience !== "string" || !audience.trim() || typeof keyId !== "string" || !keyId.trim() || !privateKey) throw new Error("Non-empty issuer, audience, key ID and private key are required");
  if (typeof internalBearerToken !== "string" || Buffer.byteLength(internalBearerToken, "utf8") < 32) throw new Error("Internal control-plane token must be at least 32 bytes");
  if (!store || typeof store.createGrant !== "function" || typeof store.getGrant !== "function" || typeof store.revokeGrant !== "function") throw new Error("Durable capability store adapter is required");
  if (typeof authenticateCaller !== "function" || typeof authorizeGrant !== "function") throw new Error("Trusted caller authentication and grant policy callbacks are required");
  createPrivateKey(privateKey);

  async function issue(req) {
    const principal = await authenticateCaller(req);
    if (!principal || typeof principal.subject !== "string" || !principal.subject.trim() || !Array.isArray(principal.tenantIds)) {
      throw problem(401, "UNAUTHENTICATED", "Trusted caller identity is required");
    }
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw problem(400, "INVALID_REQUEST", "JSON object body is required");
    const tenantId = body.tenant_id;
    const capabilities = body.capabilities;
    if (typeof tenantId !== "string" || !tenantId.trim() || !principal.tenantIds.includes(tenantId)) throw problem(403, "TENANT_DENIED", "Caller is not a member of the requested tenant");
    if (!Array.isArray(capabilities) || capabilities.length === 0 || capabilities.some((item) => typeof item !== "string" || !ALLOWED_CAPABILITIES.has(item)) || new Set(capabilities).size !== capabilities.length) {
      throw problem(400, "INVALID_CAPABILITIES", "Capabilities must be a unique, non-empty list from the canonical vocabulary");
    }
    const ttl = body.ttl_seconds ?? 300;
    if (!Number.isInteger(ttl) || ttl < 1 || ttl > MAX_TTL_SECONDS) throw problem(400, "INVALID_TTL", "ttl_seconds must be between 1 and 900");
    const scope = body.scope;
    if (scope !== undefined && (!scope || typeof scope !== "object" || Array.isArray(scope) || Object.keys(scope).some((key) => !["routes", "graphs"].includes(key)))) {
      throw problem(400, "INVALID_SCOPE", "scope may contain only routes and graphs");
    }
    if (scope && Object.values(scope).some((items) => !Array.isArray(items) || items.length === 0 || items.some((value) => typeof value !== "string" || !value.trim()))) {
      throw problem(400, "INVALID_SCOPE", "scope entries must be non-empty string arrays");
    }
    const policyInput = { tenant_id: tenantId, capabilities: [...capabilities], ttl_seconds: ttl, ...(scope ? { scope } : {}) };
    if (await authorizeGrant(principal, policyInput) !== true) throw problem(403, "GRANT_POLICY_DENIED", "Grant issuance policy denied this request");

    const now = clock();
    const claims = {
      iss: issuer,
      aud: audience,
      sub: principal.subject,
      jti: randomUUID(),
      tenant_id: tenantId,
      capabilities: [...capabilities],
      iat: now,
      nbf: now,
      exp: now + ttl,
      ...(scope ? { scope } : {}),
    };
    const token = signGrant(claims, { privateKey, keyId });
    await store.createGrant({ jti: claims.jti, subject: claims.sub, tenantId, issuedAt: now, expiresAt: claims.exp, grant: claims });
    return { token, grant: claims };
  }

  async function handle(req, res) {
    const url = new URL(req.url ?? "/", "http://control-plane.local");
    const send = (status, value) => {
      const encoded = JSON.stringify(value);
      res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "content-length": Buffer.byteLength(encoded) });
      res.end(encoded);
    };
    try {
      if (req.method === "POST" && url.pathname === "/v1/capability-grants") {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw problem(413, "BODY_TOO_LARGE", "Request body exceeds 16 KiB");
        }
        try { req.body = JSON.parse(raw); } catch { throw problem(400, "INVALID_JSON", "Request body must be valid JSON"); }
        const issued = await issue(req);
        return send(201, issued);
      }
      const revokeMatch = url.pathname.match(/^\/v1\/capability-grants\/([^/]+)\/revoke$/);
      if (req.method === "POST" && revokeMatch) {
        if (!hasInternalAuthorization(req, internalBearerToken)) throw problem(401, "UNAUTHENTICATED", "Internal control-plane authentication required");
        const jti = decodeURIComponent(revokeMatch[1]);
        const updated = await store.revokeGrant(jti, clock());
        if (!updated) throw problem(404, "GRANT_NOT_FOUND", "Capability grant not found");
        return send(200, { jti, active: false, revoked: true });
      }
      const lookupMatch = url.pathname.match(/^\/v1\/capability-grants\/([^/]+)\/revocation$/);
      if (req.method === "GET" && lookupMatch) {
        if (!hasInternalAuthorization(req, internalBearerToken)) throw problem(401, "UNAUTHENTICATED", "Internal control-plane authentication required");
        const jti = decodeURIComponent(lookupMatch[1]);
        const grant = await store.getGrant(jti);
        if (!grant) return send(200, { active: false, revoked: true });
        const expired = grant.expiresAt <= clock();
        const revoked = Boolean(grant.revokedAt);
        return send(200, { active: !expired && !revoked, revoked });
      }
      return send(404, { error: "NOT_FOUND" });
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 503;
      const code = typeof error?.code === "string" ? error.code : "CONTROL_PLANE_UNAVAILABLE";
      return send(status, { error: code, message: status >= 500 ? "Capability control-plane request failed" : error.message });
    }
  }

  return Object.freeze({ handle, issue });
}
