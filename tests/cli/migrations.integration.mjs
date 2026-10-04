// Database-backed Stage 11 migration tests. Requires the Stage 01 bootstrap roles and Stage 04 catalog schemas.
//   RUN_STAGE11_INTEGRATION=1 VIBE_MIGRATOR_URL=... VIBE_RUNTIME_URL=... VIBE_ADMIN_URL=... node --test tests/cli/migrations.integration.mjs
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { connectMigrator, runMigrations, verifyMigrations, migrationStatus } from "../../packages/vibe-cli/migrations.mjs";

const enabled = process.env.RUN_STAGE11_INTEGRATION === "1";
const { VIBE_MIGRATOR_URL: migratorUrl, VIBE_RUNTIME_URL: runtimeUrl, VIBE_ADMIN_URL: adminUrl } = process.env;
const opts = { skip: !enabled && "set RUN_STAGE11_INTEGRATION=1 to run" };

const suffix = crypto.randomBytes(4).toString("hex");
const table = `vibe_meta.cli_it_${suffix}`;
const scratch = name => `vibe_app.cli_it_${suffix}_${name}`;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "vibe-mig-it-"));
const write = (dir, name, sql) => fs.writeFileSync(path.join(dir, name), sql);
const scalar = async (client, sql, params) => (await client.query(sql, params)).rows[0];

let client;
test("connect as the approved migrator", opts, async () => {
  assert.ok(migratorUrl && runtimeUrl && adminUrl, "VIBE_MIGRATOR_URL, VIBE_RUNTIME_URL and VIBE_ADMIN_URL are required");
  client = await connectMigrator(migratorUrl);
  assert.equal((await scalar(client, "SELECT current_user AS u")).u, "vibe_migrator");
});

test("refuses superuser and runtime-role connections", opts, async () => {
  await assert.rejects(() => connectMigrator(adminUrl), e => e.code === "UNSAFE_MIGRATOR_ROLE");
  await assert.rejects(() => connectMigrator(runtimeUrl), e => e.code === "UNSAFE_MIGRATOR_ROLE");
});

test("applies pending migrations once, records checksums, and is idempotent", opts, async () => {
  const dir = tmp();
  write(dir, "0001_a.sql", `CREATE TABLE ${scratch("a")} (id int);`);
  write(dir, "0002_b.sql", `CREATE TABLE ${scratch("b")} (id int);`);
  const first = await runMigrations(client, { dir, table });
  assert.deepEqual(first.applied.map(m => m.version), [1, 2]);
  const second = await runMigrations(client, { dir, table });
  assert.equal(second.applied.length, 0);
  const rows = (await client.query(`SELECT version, name, checksum, applied_by FROM ${table} ORDER BY version`)).rows;
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.applied_by === "vibe_migrator" && /^[0-9a-f]{64}$/.test(r.checksum)));
  assert.deepEqual(await verifyMigrations(client, { dir, table }), { ok: true, applied: 2, pending: 0 });
  assert.equal((await migrationStatus(client, { dir, table })).pending.length, 0);
});

test("a failing migration rolls back atomically and records nothing", opts, async () => {
  const dir = tmp();
  write(dir, "0003_bad.sql", `CREATE TABLE ${scratch("partial")} (id int);\nSELECT 1/0;`);
  await assert.rejects(() => runMigrations(client, { dir: withApplied(dir), table }), e => e.code === "MIGRATION_FAILED");
  assert.equal((await scalar(client, "SELECT to_regclass($1) AS t", [scratch("partial")])).t, null);
  assert.equal((await scalar(client, `SELECT count(*)::int AS n FROM ${table} WHERE version = 3`)).n, 0);
});

test("drift is detected: modified applied migration is refused", opts, async () => {
  const dir = tmp();
  write(dir, "0001_a.sql", `CREATE TABLE ${scratch("a")} (id int, extra int);`);
  write(dir, "0002_b.sql", `CREATE TABLE ${scratch("b")} (id int);`);
  await assert.rejects(() => verifyMigrations(client, { dir, table }), e => e.code === "CHECKSUM_MISMATCH");
  await assert.rejects(() => runMigrations(client, { dir, table }), e => e.code === "CHECKSUM_MISMATCH");
});

test("out-of-order and missing-file states are refused", opts, async () => {
  const dir = tmp();
  write(dir, "0001_a.sql", `CREATE TABLE ${scratch("a")} (id int);`);
  write(dir, "0002_b.sql", `CREATE TABLE ${scratch("b")} (id int);`);
  write(dir, "0000_early.sql", "SELECT 1;");
  await assert.rejects(() => runMigrations(client, { dir, table }), e => e.code === "OUT_OF_ORDER");
  const missing = tmp();
  write(missing, "0001_a.sql", `CREATE TABLE ${scratch("a")} (id int);`);
  await assert.rejects(() => verifyMigrations(client, { dir: missing, table }), e => e.code === "MISSING_APPLIED_MIGRATION");
});

test("the migrator cannot escalate privileges from a migration", opts, async () => {
  const dir = tmp();
  write(dir, "0100_escalate.sql", `CREATE ROLE cli_it_${suffix}_evil SUPERUSER;`);
  const base = withApplied(dir);
  await assert.rejects(() => runMigrations(client, { dir: base, table }), e => e.code === "MIGRATION_FAILED");
  const dir2 = tmp();
  write(dir2, "0101_alter.sql", "ALTER ROLE vibe_migrator SUPERUSER;");
  await assert.rejects(() => runMigrations(client, { dir: withApplied(dir2), table }), e => e.code === "MIGRATION_FAILED");
  assert.equal((await scalar(client, "SELECT rolsuper FROM pg_roles WHERE rolname = 'vibe_migrator'")).rolsuper, false);
  assert.equal((await scalar(client, "SELECT count(*)::int AS n FROM pg_roles WHERE rolname = $1", [`cli_it_${suffix}_evil`])).n, 0);
});

test("concurrent runners serialize and apply each migration exactly once", opts, async () => {
  const dir = tmp();
  const concurrentTable = `vibe_meta.cli_it_${suffix}_c`;
  write(dir, "0001_slow.sql", `SELECT pg_sleep(1);\nCREATE TABLE ${scratch("c1")} (id int);`);
  write(dir, "0002_next.sql", `CREATE TABLE ${scratch("c2")} (id int);`);
  const other = await connectMigrator(migratorUrl);
  try {
    const [a, b] = await Promise.all([
      runMigrations(client, { dir, table: concurrentTable }),
      runMigrations(other, { dir, table: concurrentTable })
    ]);
    assert.equal(a.applied.length + b.applied.length, 2, "each migration applied exactly once across runners");
    assert.equal(a.skipped.length + b.skipped.length, 2, "the losing runner skipped them after re-checking under the lock");
    assert.equal((await scalar(client, `SELECT count(*)::int AS n FROM ${concurrentTable}`)).n, 2);
  } finally {
    await other.end();
    await client.query(`DROP TABLE IF EXISTS ${concurrentTable}, ${scratch("c1")}, ${scratch("c2")}`);
  }
});

test("the tracking table is not readable by the runtime role", opts, async () => {
  const runtime = new pg.Client({ connectionString: runtimeUrl });
  await runtime.connect();
  try {
    await assert.rejects(() => runtime.query(`SELECT * FROM ${table}`), /permission denied/);
  } finally {
    await runtime.end();
  }
});

test("cleanup scratch objects", opts, async () => {
  await client.query(`DROP TABLE IF EXISTS ${table}, ${scratch("a")}, ${scratch("b")}, ${scratch("partial")}`);
  await client.end();
});

// Builds a dir containing the already-applied 0001/0002 files (so drift checks pass) plus the file(s) under test.
function withApplied(extraDir) {
  const dir = tmp();
  write(dir, "0001_a.sql", `CREATE TABLE ${scratch("a")} (id int);`);
  write(dir, "0002_b.sql", `CREATE TABLE ${scratch("b")} (id int);`);
  for (const file of fs.readdirSync(extraDir)) fs.copyFileSync(path.join(extraDir, file), path.join(dir, file));
  return dir;
}
