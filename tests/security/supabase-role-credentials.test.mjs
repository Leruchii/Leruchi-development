import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const rolesSql = readFileSync(new URL("../../infra/supabase/roles.sql", import.meta.url), "utf8");
const compose = readFileSync(new URL("../../infra/supabase/docker-compose.yml", import.meta.url), "utf8");

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
