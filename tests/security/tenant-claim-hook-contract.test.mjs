import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const hookSql = readFileSync(new URL("../../infra/supabase/tenant-claim-hook.sql", import.meta.url), "utf8");
const compose = readFileSync(new URL("../../infra/supabase/docker-compose.yml", import.meta.url), "utf8");

test("Supabase Auth enables the versioned tenant-claim hook", () => {
  assert.match(compose, /GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_ENABLED:\s*"true"/);
  assert.match(compose, /GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_URI:\s*pg-functions:\/\/postgres\/vibe_auth\/custom_access_token_hook/);
});

test("the hook removes caller-supplied tenant claims before resolving membership", () => {
  assert.match(hookSql, /claims := claims - 'tenant_id'/);
  assert.match(hookSql, /user_metadata,active_tenant_id/);
  assert.match(hookSql, /membership\.tenant_id = requested_tenant_id/);
  assert.match(hookSql, /membership\.membership_status = 'active'/);
});

test("the hook fails closed when the selected tenant has no active membership", () => {
  assert.match(hookSql, /No active membership or an invalid selection means no tenant claim is issued/);
  assert.match(hookSql, /IF resolved_tenant_id IS NOT NULL THEN/);
  assert.match(hookSql, /claims := jsonb_set\(claims, '\{tenant_id\}'/);
});

test("membership records remain private and RLS applies to the Auth hook role", () => {
  assert.match(hookSql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(hookSql, /FORCE ROW LEVEL SECURITY/);
  assert.match(hookSql, /TO supabase_auth_admin/);
  assert.match(hookSql, /GRANT SELECT ON TABLE vibe_auth\.user_tenant_memberships TO supabase_auth_admin/);
  assert.match(hookSql, /REVOKE ALL ON TABLE vibe_auth\.user_tenant_memberships\s+FROM PUBLIC, anon, authenticated, service_role/);
  assert.doesNotMatch(hookSql, /SECURITY DEFINER/i);
});
