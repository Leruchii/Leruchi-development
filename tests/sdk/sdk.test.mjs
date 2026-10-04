import test from "node:test";
import assert from "node:assert/strict";
import { createClient, createFetchTransport, VibeClientError } from "../../packages/vibe-sdk/index.mjs";

function transportRecorder() {
  const calls = [];
  return { calls, request: async (kind, body) => { calls.push({ kind, body }); return { ok: true, kind }; } };
}

test("builds engine-neutral Query IR without Cypher or SQL", async () => {
  const transport = transportRecorder();
  const vibe = createClient({ transport });
  const result = await vibe.graph("vibe_security").query("Account")
    .select(["name"])
    .eq("name", "Alice")
    .traverse("KNOWS", "out", "Account", "friend")
    .select([{ field: "name" }])
    .limit(25)
    .execute();
  const call = transport.calls[0];
  assert.equal(call.kind, "query");
  assert.equal(call.body.ir.version, "v1");
  assert.equal(call.body.ir.kind, "graph_query");
  assert.equal(call.body.ir.steps[0].edge, "KNOWS");
  assert.equal(call.body.ir.limit, 25);
  assert.equal(call.body.parameters.name, undefined);
  assert.equal(JSON.stringify(call.body.ir).includes("cypher"), false);
  assert.equal(JSON.stringify(call.body.ir).includes("sql"), false);
  assert.equal(result.ok, true);
});

test("supports explicit parameter binding without putting values into IR", async () => {
  const transport = transportRecorder();
  const vibe = createClient({ transport });
  const query = vibe.graph("vibe_security").query("Account").select(["name"]);
  const ref = query.bind("name", "string", "Alice");
  query.eq("name", ref);
  await query.execute();
  const body = transport.calls[0].body;
  assert.deepEqual(body.ir.parameters, [{ name: "name", type: "string", required: true }]);
  assert.deepEqual(body.ir.filters[0].value, { param: "name" });
  assert.deepEqual(body.parameters, { name: "Alice" });
});

test("builds graph mutations through the same Vibe surface", async () => {
  const transport = transportRecorder();
  const vibe = createClient({ transport });
  await vibe.graph("vibe_security").createEdge(
    "KNOWS",
    { label: "Account", field: "name", value: "Alice" },
    { label: "Account", field: "name", value: "Bob" },
    { kind: "friend" }
  ).execute();
  const body = transport.calls[0].body;
  assert.equal(transport.calls[0].kind, "mutation");
  assert.equal(body.ir.kind, "graph_mutation");
  assert.equal(body.ir.operation, "create_edge");
  assert.equal(body.ir.target.edge, "KNOWS");
  assert.equal(body.ir.properties.kind, "friend");
});

test("rejects unsafe identifiers and client-side guardrail violations", () => {
  const vibe = createClient({ transport: transportRecorder() });
  assert.throws(() => vibe.graph("vibe_security").query("Account").select(["name; DROP"]), e => e instanceof VibeClientError && e.code === "INVALID_FIELD");
  assert.throws(() => vibe.graph("vibe_security").query("Account").select(["name"]).limit(1001), e => e instanceof VibeClientError && e.code === "INVALID_LIMIT");
  assert.throws(() => vibe.graph("vibe_security").query("Account").select(["name"]).depth(7), e => e instanceof VibeClientError && e.code === "INVALID_DEPTH");
});

test("does not accept engine fragments through query builders", () => {
  const transport = transportRecorder();
  const vibe = createClient({ transport });
  const query = vibe.graph("vibe_security").query("Account").select(["name"]);
  assert.throws(() => query.where("name", "eq", { sql: "DROP TABLE" }), e => e instanceof VibeClientError && e.code === "INVALID_VALUE");
  assert.equal(transport.calls.length, 0);
});

test("HTTP transport sends bearer token and Vibe endpoint", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, async json() { return { rows: [] }; } };
  };
  const transport = createFetchTransport({ baseUrl: "https://api.example/", token: "test-token", fetchImpl });
  await transport.request("query", { ir: { version: "v1" }, parameters: {} });
  assert.equal(calls[0].url, "https://api.example/v1/graph/query");
  assert.equal(calls[0].init.headers.authorization, "Bearer test-token");
});
