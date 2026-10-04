// Stage 11 remote Schema Catalog contract test against a real PostgREST server (Supabase compatibility core).
//   RUN_STAGE11_REMOTE=1 VIBE_BASE_URL=http://127.0.0.1:3000 VIBE_TEST_JWT_SECRET=... node --test tests/cli/catalog-remote.integration.mjs
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { run } from "../../packages/vibe-cli/index.mjs";

const enabled = process.env.RUN_STAGE11_REMOTE === "1";
const opts = { skip: !enabled && "set RUN_STAGE11_REMOTE=1 to run" };
const baseUrl = process.env.VIBE_BASE_URL;
const secret = process.env.VIBE_TEST_JWT_SECRET;
const b64 = value => Buffer.from(value).toString("base64url");

function sign(claims, key = secret) {
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64(JSON.stringify({ aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 300, ...claims }));
  const signature = crypto.createHmac("sha256", key).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function rawCatalog(token) {
  const response = await fetch(`${baseUrl}/rpc/vibe_schema_catalog`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: response.status, text: await response.text() };
}

async function pull(token, extraArgs = []) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-remote-"));
  const previous = process.env.VIBE_TOKEN;
  if (token) process.env.VIBE_TOKEN = token; else delete process.env.VIBE_TOKEN;
  process.env.VIBE_BASE_URL = baseUrl;
  try {
    const out = [];
    const code = await run(["schema", "pull", ...extraArgs], { cwd, stdout: v => out.push(v), stderr() {} });
    return { code, output: out.join(""), cwd };
  } finally {
    if (previous === undefined) delete process.env.VIBE_TOKEN; else process.env.VIBE_TOKEN = previous;
  }
}

test("environment is configured", opts, () => {
  assert.ok(baseUrl && secret, "VIBE_BASE_URL and VIBE_TEST_JWT_SECRET are required");
});

test("unauthenticated and anon callers are refused", opts, async () => {
  assert.notEqual((await rawCatalog(null)).status, 200);
  assert.notEqual((await rawCatalog(sign({ role: "anon" }))).status, 200);
  await assert.rejects(() => pull(null), /VIBE_TOKEN is required/);
});

test("forged, wrongly signed and expired JWTs are refused", opts, async () => {
  assert.equal((await rawCatalog(sign({ role: "authenticated" }, "wrong-secret-wrong-secret-wrong-32"))).status, 401);
  assert.equal((await rawCatalog(sign({ role: "authenticated", exp: Math.floor(Date.now() / 1000) - 60 }))).status, 401);
  assert.equal((await rawCatalog(sign({ role: "service_role" }, "x".repeat(40)))).status, 401);
});

test("authenticated callers receive the v1 catalog contract and CLI generates types from it", opts, async () => {
  const token = sign({ role: "authenticated", tenant_id: "tenant_a" });
  const raw = await rawCatalog(token);
  assert.equal(raw.status, 200);
  const payload = JSON.parse(raw.text);
  assert.equal(payload.catalog_version, "v1");
  assert.deepEqual(payload.graphs.vibe_stage01.labels, ["Person"]);
  assert.deepEqual(payload.graphs.vibe_stage01.edges, [{ name: "KNOWS", from: "Person", to: "Person" }]);

  const result = await pull(token, ["--out", "vibe.d.ts", "--catalog-out", "catalog.json"]);
  assert.equal(result.code, 0);
  const types = fs.readFileSync(path.join(result.cwd, "vibe.d.ts"), "utf8");
  assert.match(types, /export type VibeGraph = "vibe_stage01";/);
  assert.match(types, /export type VibeLabel = "Person";/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.cwd, "catalog.json"), "utf8")).graphs.vibe_stage01.labels[0], "Person");
});

test("the catalog exposes structure only, never properties, policies or row data", opts, async () => {
  const { text } = await rawCatalog(sign({ role: "authenticated", tenant_id: "tenant_a" }));
  assert.deepEqual(Object.keys(JSON.parse(text)).sort(), ["catalog_version", "graphs"]);
  for (const forbidden of ["properties", "policy", "using", "with_check", "A-visible", "B-hidden", "tenant_"]) assert.equal(text.includes(forbidden), false, forbidden);
});

test("catalog structure is shared across tenants (decision: global v1 structure)", opts, async () => {
  const a = await rawCatalog(sign({ role: "authenticated", tenant_id: "tenant_a" }));
  const b = await rawCatalog(sign({ role: "authenticated", tenant_id: "tenant_b" }));
  assert.equal(a.status, 200);
  assert.equal(a.text, b.text);
});
