import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bootstrap = fs.readFileSync("infra/docker/postgres/init/01-vibe-bootstrap.sh", "utf8");
const compose = fs.readFileSync("docker-compose.yml", "utf8");

test("database bootstrap prefers Leruchi variables and retains Vibe fallbacks", () => {
  assert.match(bootstrap, /LERUCHI_MIGRATOR_PASSWORD=.*VIBE_MIGRATOR_PASSWORD/);
  assert.match(bootstrap, /LERUCHI_RUNTIME_PASSWORD=.*VIBE_RUNTIME_PASSWORD/);
  assert.match(bootstrap, /LERUCHI_REALTIME_PASSWORD=.*VIBE_REALTIME_PASSWORD/);
  assert.match(bootstrap, /--set=vibe_migrator_password="\$LERUCHI_MIGRATOR_PASSWORD"/);
  assert.match(bootstrap, /--set=vibe_runtime_password="\$LERUCHI_RUNTIME_PASSWORD"/);
  assert.match(bootstrap, /--set=vibe_realtime_password="\$LERUCHI_REALTIME_PASSWORD"/);
});

test("Compose prefers canonical environment values without breaking legacy configuration", () => {
  for (const key of ["MIGRATOR", "RUNTIME", "REALTIME"]) {
    assert.match(compose, new RegExp("LERUCHI_" + key + "_PASSWORD:.*VIBE_" + key + "_PASSWORD"));
    assert.match(compose, new RegExp("VIBE_" + key + "_PASSWORD:"));
  }
});

test("compatibility hardening does not rename persisted database or volume identifiers", () => {
  assert.match(compose, /POSTGRES_DB:\s*vibedb/);
  assert.match(compose, /vibedb_pgdata/);
  assert.match(bootstrap, /GRANT CONNECT ON DATABASE vibedb/);
});
