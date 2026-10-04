import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  MigrationError, assertMigratorIdentity, connectMigrator, discoverMigrations, planMigrations,
  redact, runMigrations, scaffoldMigration, migrationStatus
} from "../../packages/vibe-cli/migrations.mjs";
import { run } from "../../packages/vibe-cli/index.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "vibe-mig-"));
const write = (dir, name, sql) => fs.writeFileSync(path.join(dir, name), sql);
const migratorRow = { current_user_name: "vibe_migrator", session_user_name: "vibe_migrator", rolsuper: false, rolbypassrls: false, rolcreaterole: false, rolcreatedb: false, rolreplication: false };

function fakeClient({ applied = [], tableExists = true, failOn, identity = migratorRow } = {}) {
  const log = [];
  return {
    log,
    async query(text, params) {
      const sql = text.replace(/\s+/g, " ").trim();
      log.push({ sql, params });
      if (failOn && sql.includes(failOn)) throw new Error("boom: " + failOn);
      if (sql.includes("FROM pg_catalog.pg_roles")) return { rows: identity ? [identity] : [] };
      if (sql.startsWith("SELECT to_regclass")) return { rows: [{ present: tableExists }] };
      if (sql.startsWith("SELECT version, name, checksum")) return { rows: applied };
      if (sql.startsWith("SELECT checksum FROM")) return { rows: [] };
      if (sql.includes("transaction_timestamp()")) return { rows: [{ ts: "fixed" }] };
      return { rows: [] };
    },
    async end() { this.ended = true; }
  };
}

test("discovers migrations in numeric order with checksums", () => {
  const dir = tmp();
  write(dir, "0002_second.sql", "SELECT 2;");
  write(dir, "0001_first.sql", "SELECT 1;");
  write(dir, "README.md", "ignored");
  const files = discoverMigrations(dir);
  assert.deepEqual(files.map(f => f.version), [1, 2]);
  assert.match(files[0].checksum, /^[0-9a-f]{64}$/);
});

test("rejects malformed names, duplicates, empty files and NUL bytes", () => {
  for (const [name, body, code] of [
    ["001_short.sql", "SELECT 1;", "INVALID_MIGRATION_NAME"],
    ["0001_Bad-Name.sql", "SELECT 1;", "INVALID_MIGRATION_NAME"],
    ["0001_empty.sql", "", "INVALID_MIGRATION_FILE"],
    ["0001_nul.sql", "SELECT 1;\u0000", "INVALID_MIGRATION_FILE"]
  ]) {
    const dir = tmp();
    write(dir, name, body);
    assert.throws(() => discoverMigrations(dir), error => error.code === code, name);
  }
  const dir = tmp();
  write(dir, "0001_a.sql", "SELECT 1;");
  write(dir, "00001_b.sql", "SELECT 1;");
  assert.throws(() => discoverMigrations(dir), error => error.code === "DUPLICATE_VERSION");
});

test("rejects symlinked migration files", () => {
  const dir = tmp();
  const outside = path.join(tmp(), "evil.sql");
  fs.writeFileSync(outside, "SELECT 1;");
  fs.symlinkSync(outside, path.join(dir, "0001_evil.sql"));
  assert.throws(() => discoverMigrations(dir), error => error.code === "INVALID_MIGRATION_FILE");
});

test("rejects migrations that manage their own transactions", () => {
  for (const sql of ["BEGIN;\nSELECT 1;\nCOMMIT;", "SELECT 1;\nCOMMIT;", "ROLLBACK;", "START TRANSACTION;", "begin transaction;"]) {
    const dir = tmp();
    write(dir, "0001_tx.sql", sql);
    assert.throws(() => discoverMigrations(dir), error => error.code === "TRANSACTION_CONTROL", sql);
  }
  const dir = tmp();
  write(dir, "0001_fn.sql", "CREATE FUNCTION f() RETURNS void LANGUAGE plpgsql AS $$\nBEGIN\n  PERFORM 1;\nEND;\n$$;\n-- commit is only mentioned in a comment");
  assert.equal(discoverMigrations(dir).length, 1);
});

test("plan: detects drift, missing files, renames and out-of-order migrations", () => {
  const dir = tmp();
  write(dir, "0001_a.sql", "SELECT 1;");
  write(dir, "0003_c.sql", "SELECT 3;");
  const files = discoverMigrations(dir);
  const [a, c] = files;
  assert.deepEqual(planMigrations(files, []).pending.map(f => f.version), [1, 3]);
  assert.deepEqual(planMigrations(files, [{ version: 1, name: "a", checksum: a.checksum }]).pending.map(f => f.version), [3]);
  assert.throws(() => planMigrations(files, [{ version: 1, name: "a", checksum: "0".repeat(64) }]), e => e.code === "CHECKSUM_MISMATCH");
  assert.throws(() => planMigrations(files, [{ version: 2, name: "b", checksum: "x" }]), e => e.code === "MISSING_APPLIED_MIGRATION");
  assert.throws(() => planMigrations(files, [{ version: 1, name: "renamed", checksum: a.checksum }]), e => e.code === "NAME_MISMATCH");
  assert.throws(() => planMigrations(files, [{ version: 3, name: "c", checksum: c.checksum }]), e => e.code === "OUT_OF_ORDER");
});

test("identity guard refuses superuser, BYPASSRLS, other roles and unknown rows", async () => {
  await assertMigratorIdentity(fakeClient());
  for (const identity of [
    { ...migratorRow, rolsuper: true },
    { ...migratorRow, rolbypassrls: true },
    { ...migratorRow, rolcreaterole: true },
    { ...migratorRow, rolcreatedb: true },
    { ...migratorRow, rolreplication: true },
    { ...migratorRow, current_user_name: "vibe_runtime" },
    { ...migratorRow, session_user_name: "postgres" },
    null
  ]) {
    await assert.rejects(() => assertMigratorIdentity(fakeClient({ identity })), e => e.code === "UNSAFE_MIGRATOR_ROLE");
  }
});

test("connectMigrator validates URL, closes unsafe connections and redacts credentials", async () => {
  await assert.rejects(() => connectMigrator("mysql://x"), e => e.code === "INVALID_MIGRATOR_URL");
  let ended = false;
  class Unsafe { constructor() {} async connect() {} async query() { return { rows: [{ ...migratorRow, rolsuper: true }] }; } async end() { ended = true; } }
  await assert.rejects(() => connectMigrator("postgres://postgres:pw@h/db", { Client: Unsafe }), e => e.code === "UNSAFE_MIGRATOR_ROLE");
  assert.equal(ended, true);
  const url = "postgres://vibe_migrator:s3cret@db.example/vibedb";
  class Failing { async connect() { throw new Error(`connect failed for ${url} password s3cret`); } async end() {} }
  await assert.rejects(() => connectMigrator(url, { Client: Failing }), e => e.code === "CONNECTION_FAILED" && !e.message.includes("s3cret") && !e.message.includes("db.example"));
  assert.equal(redact(`x ${url} y s3cret`, url).includes("s3cret"), false);
});

test("runMigrations applies each pending file in its own locked transaction and records the checksum", async () => {
  const dir = tmp();
  write(dir, "0001_a.sql", "CREATE TABLE a();");
  write(dir, "0002_b.sql", "CREATE TABLE b();");
  const client = fakeClient({ tableExists: false });
  const result = await runMigrations(client, { dir });
  assert.deepEqual(result.applied.map(m => m.version), [1, 2]);
  const sql = client.log.map(entry => entry.sql);
  const first = sql.indexOf("CREATE TABLE a();");
  assert.ok(first > 0);
  assert.equal(sql[first - 1].includes("transaction_timestamp()"), true);
  assert.ok(sql.some(s => s.startsWith("SELECT pg_advisory_xact_lock")));
  assert.equal(sql.filter(s => s === "BEGIN").length, 3);
  assert.equal(sql.filter(s => s === "COMMIT").length, 3);
  assert.equal(sql.filter(s => s.startsWith("INSERT INTO vibe_meta.schema_migrations")).length, 2);
  assert.equal(sql.includes("ROLLBACK"), false);
});

test("runMigrations rolls back and records nothing when a migration fails", async () => {
  const dir = tmp();
  write(dir, "0001_good.sql", "CREATE TABLE good();");
  write(dir, "0002_bad.sql", "CREATE TABLE boom();");
  const client = fakeClient({ failOn: "CREATE TABLE boom" });
  await assert.rejects(() => runMigrations(client, { dir }), e => e.code === "MIGRATION_FAILED" && /rolled back/.test(e.message));
  const sql = client.log.map(entry => entry.sql);
  assert.equal(sql.filter(s => s.startsWith("INSERT INTO")).length, 1);
  assert.equal(sql.at(-1), "ROLLBACK");
});

test("dry-run and status never write", async () => {
  const dir = tmp();
  write(dir, "0001_a.sql", "CREATE TABLE a();");
  const client = fakeClient({ tableExists: false });
  const dry = await runMigrations(client, { dir, dryRun: true });
  assert.equal(dry.pending.length, 1);
  await migrationStatus(client, { dir });
  assert.equal(client.log.some(entry => /^(BEGIN|CREATE|INSERT|COMMIT)/.test(entry.sql)), false);
});

test("a migration that ends its own transaction is detected", async () => {
  const dir = tmp();
  write(dir, "0001_a.sql", "SELECT 1;");
  const client = fakeClient();
  let calls = 0;
  const original = client.query.bind(client);
  client.query = async (text, params) => {
    if (text.includes("transaction_timestamp()")) return { rows: [{ ts: ++calls === 1 ? "first" : "second" }] };
    return original(text, params);
  };
  await assert.rejects(() => runMigrations(client, { dir }), e => e.code === "TRANSACTION_CONTROL");
});

test("tracking table name cannot be used for SQL injection", async () => {
  const dir = tmp();
  write(dir, "0001_a.sql", "SELECT 1;");
  await assert.rejects(() => runMigrations(fakeClient(), { dir, table: "vibe_meta.m; DROP TABLE x" }), e => e.code === "INVALID_TRACKING_TABLE");
});

test("scaffold creates the next version and refuses bad names", () => {
  const dir = tmp();
  assert.equal(scaffoldMigration(dir, "add_accounts"), "0001_add_accounts.sql");
  assert.equal(scaffoldMigration(dir, "add_edges"), "0002_add_edges.sql");
  assert.throws(() => scaffoldMigration(dir, "../escape"), e => e.code === "INVALID_MIGRATION_NAME");
  assert.throws(() => scaffoldMigration(dir, "Bad Name"), e => e.code === "INVALID_MIGRATION_NAME");
});

test("CLI migrate: requires VIBE_MIGRATOR_URL, stays inside the project, never persists secrets", async () => {
  const cwd = tmp();
  const previous = process.env.VIBE_MIGRATOR_URL;
  delete process.env.VIBE_MIGRATOR_URL;
  try {
    await assert.rejects(() => run(["migrate", "status"], { cwd, stdout() {}, stderr() {} }), /VIBE_MIGRATOR_URL is required/);
    await assert.rejects(() => run(["migrate", "new", "x", "--dir", "../outside"], { cwd, stdout() {}, stderr() {} }), /inside the project/);
    await assert.rejects(() => run(["migrate", "new", "x", "--dir", "/etc"], { cwd, stdout() {}, stderr() {} }), /inside the project/);
    const out = [];
    assert.equal(await run(["migrate", "new", "add_accounts"], { cwd, stdout: v => out.push(v), stderr() {} }), 0);
    assert.match(out.join(""), /0001_add_accounts\.sql/);
    process.env.VIBE_MIGRATOR_URL = "postgres://vibe_migrator:s3cret@db/vibedb";
    const client = fakeClient({ tableExists: false });
    const output = [];
    assert.equal(await run(["migrate", "status"], { cwd, stdout: v => output.push(v), stderr() {}, connect: async () => client }), 0);
    assert.equal(client.ended, true);
    assert.equal(fs.existsSync(path.join(cwd, ".vibe")), false);
    assert.equal(output.join("").includes("s3cret"), false);
  } finally {
    if (previous === undefined) delete process.env.VIBE_MIGRATOR_URL; else process.env.VIBE_MIGRATOR_URL = previous;
  }
});

test("CLI migrate redacts the connection string from unexpected driver errors", async () => {
  const cwd = tmp();
  const dir = path.join(cwd, "migrations");
  fs.mkdirSync(dir);
  write(dir, "0001_a.sql", "SELECT 1;");
  const url = "postgres://vibe_migrator:s3cret@db/vibedb";
  process.env.VIBE_MIGRATOR_URL = url;
  try {
    const client = { async query() { throw new Error(`driver exploded on ${url}`); }, async end() {} };
    await assert.rejects(() => run(["migrate", "up"], { cwd, stdout() {}, stderr() {}, connect: async () => client }), e => !e.message.includes("s3cret"));
  } finally {
    delete process.env.VIBE_MIGRATOR_URL;
  }
});
