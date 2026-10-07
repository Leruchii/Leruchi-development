import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const bootstrap=fs.readFileSync("infra/docker/postgres/init/01-leruchi-bootstrap.sh","utf8");
const migration=fs.readFileSync("infra/migrations/0002-graph-realtime-outbox.sql","utf8");
const realtime=fs.readFileSync("packages/realtime-outbox/index.mjs","utf8");

test("runtime and realtime database identities are separated",()=>{
  assert.match(bootstrap,/CREATE ROLE vibe_runtime[\s\S]*NOBYPASSRLS/);
  assert.match(bootstrap,/CREATE ROLE vibe_realtime[\s\S]*NOBYPASSRLS/);
  assert.match(bootstrap,/LERUCHI_REALTIME_PASSWORD/);
  assert.doesNotMatch(bootstrap,/GRANT .*vibe_runtime.*vibe_realtime/);
});

test("realtime outbox is fail-closed for runtime tenant access",()=>{
  assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
  assert.match(migration,/FORCE ROW LEVEL SECURITY/);
  assert.match(migration,/tenant_id = COALESCE\(NULLIF\(current_setting\("request\.jwt\.claims", true\)/);
  assert.match(migration,/TO vibe_runtime[\s\S]*WITH CHECK/);
  assert.match(migration,/TO vibe_realtime[\s\S]*USING \(true\)/);
  assert.match(realtime,/role!==\"realtime_relay\"/);
});

test("client realtime events never carry tenant authorization state",()=>{
  assert.match(realtime,/return \{[\s\S]*event_id:row\.event_id/);
  assert.match(realtime,/target:\{kind:row\.target_kind/);
  assert.match(realtime,/\\"tenant_id\\" in event/);
});
