import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const fail = message => { throw new Error("ARCHITECTURE AUDIT: " + message); };

const catalog = read("infra/catalog/04-schema-catalog.sql");
assert.match(catalog, /tenant_id text NOT NULL DEFAULT ''/, "catalog must use an explicit shared tenant scope");
assert.match(catalog, /ENABLE ROW LEVEL SECURITY/, "catalog tables must use RLS");
assert.match(catalog, /FORCE ROW LEVEL SECURITY/, "catalog tables must force RLS");
assert.match(catalog, /graph_catalog_visibility/, "graph catalog visibility policy missing");
assert.match(catalog, /schema_catalog_visibility/, "schema catalog visibility policy missing");
assert.match(catalog, /request\.jwt\.claims/, "catalog policy must derive private scope from trusted JWT claims");
if (!catalog.includes("GRANT SELECT ON vibe_meta.schema_catalog_entries, vibe_meta.graph_catalog_registry TO vibe_runtime;")) fail("catalog grants must remain runtime-scoped");
if (/GRANT SELECT.*TO PUBLIC/.test(catalog)) fail("catalog data grants must not be PUBLIC");

const roles = read("infra/docker/postgres/init/01-vibe-bootstrap.sh");
assert.match(roles, /CREATE ROLE vibe_runtime[\s\S]*NOBYPASSRLS/, "runtime role must not bypass RLS");
assert.match(roles, /CREATE ROLE vibe_migrator[\s\S]*NOBYPASSRLS/, "migrator role must not bypass RLS");
if (roles.includes("CREATE ROLE vibe_realtime")) assert.match(roles, /CREATE ROLE vibe_realtime[\s\S]*NOBYPASSRLS/, "realtime role must not bypass RLS");

const migrationsDir = path.join(root, "infra", "migrations");
const migrations = fs.readdirSync(migrationsDir)
  .filter(f => /^\d{4}-[a-z0-9][a-z0-9-]*\.sql$/.test(f))
  .sort();
if (!migrations.length || migrations[0] !== "0000-migration-ledger.sql") {
  fail("migration chain must begin with 0000-migration-ledger.sql");
}
for (const file of migrations) {
  const sql = read(path.join("infra", "migrations", file));
  assert.match(sql, /ON_ERROR_STOP|current_user <> 'vibe_migrator'/, file + " lacks migrator safety checks");
  if (file !== "0000-migration-ledger.sql") {
    assert.match(sql, /schema_migrations/, file + " must record itself in the migration ledger");
  }
}

const definerFiles = ["infra/catalog/04-schema-catalog.sql"];
for (const file of definerFiles) {
  const source = read(file);
  if (/SECURITY DEFINER/.test(source) && !/SET search_path\s*=/.test(source)) {
    fail(file + " contains SECURITY DEFINER without a pinned search_path");
  }
}

const sdk = read("packages/leruchi-sdk/index.mjs");
const cli = read("packages/leruchi-cli/index.mjs");
for (const [name, source] of [["SDK", sdk], ["CLI", cli]]) {
  if (/\b(cypher|ag_catalog|SELECT\s+|INSERT\s+|UPDATE\s+|DELETE\s+)/i.test(source)) {
    fail(name + " must remain a thin client boundary and not contain database/compiler logic");
  }
}
if (/tenant[_-]?id\s*[:=]/i.test(sdk)) fail("SDK must not expose client-controlled tenant authorization state");

// The sanitized public export intentionally excludes the internal BUILD_PLAN.md.
// Verify the public-facing architecture documentation instead of requiring an internal control-plane file.
const publicDocs = read("README.md");
assert.match(publicDocs, /engine-neutral contract/i, "public docs must describe the engine-neutral Query IR boundary");
assert.match(publicDocs, /tenant authorization/i, "public docs must state that tenant authorization occurs behind the IR boundary");

console.log(JSON.stringify({
  status: "ok",
  checks: [
    "catalog tenant scope + RLS",
    "runtime/migrator role hardening",
    "numbered migration chain",
    "security-definer search_path",
    "SDK/CLI compiler-boundary scan",
    "architecture decision documentation"
  ]
}, null, 2));
