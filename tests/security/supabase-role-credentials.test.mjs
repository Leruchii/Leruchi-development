import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const rolesSql = readFileSync(new URL("../../infra/supabase/roles.sql", import.meta.url), "utf8");
const compose = readFileSync(new URL("../../infra/supabase/docker-compose.yml", import.meta.url), "utf8");
const rootCompose = readFileSync(new URL("../../docker-compose.yml", import.meta.url), "utf8");

function sqlPassword(role) {
  const block = rolesSql.match(new RegExp("CREATE ROLE\\s+" + role + "\\b([\\s\\S]*?)END IF;"))?.[1];
  const match = block?.match(/PASSWORD '([^']+)'/);
  assert.ok(match, "Expected a password declaration for role " + role + " in roles.sql");
  return match[1];
}

const cases = [
  ["authenticator", /PGRST_DB_URI:.*authenticator:([^@]+)@/],
  ["supabase_auth_admin", /GOTRUE_DB_DATABASE_URL:.*supabase_auth_admin:([^@]+)@/],
  ["supabase_storage_admin", /DATABASE_URL:.*supabase_storage_admin:([^@]+)@/],
  ["supabase_admin", /DB_USER: supabase_admin\n[ \t]*DB_PASSWORD: ([^\s]+)/]
];

for (const [role, pattern] of cases) {
  test(role + " SQL password matches its Supabase service configuration", () => {
    const configured = compose.match(pattern)?.[1];
    assert.ok(configured, "Expected Compose credentials for role " + role);
    assert.equal(sqlPassword(role), configured);
  });
}

test("development database and Supabase ports bind to loopback only", () => {
  assert.match(rootCompose, /- "127\\.0\\.0\\.1:5432:5432"/);
  assert.match(compose, /- "127\\.0\\.0\\.1:9999:9999"/);
  assert.match(compose, /- "127\\.0\\.0\\.1:3000:3000"/);
  assert.doesNotMatch(rootCompose, /- "\\d{2,5}:\\d{2,5}"/);
  assert.doesNotMatch(compose, /- "\\d{2,5}:\\d{2,5}"/);
});
