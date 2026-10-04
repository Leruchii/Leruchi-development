import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Stage 11 migration contract (see knowledge/decisions/stage-11-cli.md).
// - Migrations are forward-only, ordered SQL files in a project `migrations/` directory.
// - They run ONLY as the approved `vibe_migrator` role; superuser/BYPASSRLS/CREATEROLE/CREATEDB/REPLICATION are refused.
// - Each migration runs in its own transaction, serialized by an advisory lock, and is recorded with a SHA-256 checksum.
// - The CLI never accepts SQL on the command line and never persists the connection string.

export const MIGRATOR_ROLE = "vibe_migrator";
export const DEFAULT_TRACKING_TABLE = "vibe_meta.schema_migrations";
export const MAX_MIGRATION_BYTES = 1024 * 1024;

const FILE_RE = /^(\d{4,9})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;
const NAME_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const TABLE_RE = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/;
const TRANSACTION_CONTROL = [
  /^\s*(commit|rollback|abort)\b/im,
  /^\s*start\s+transaction\b/im,
  /^\s*begin\s*(;|\s+(transaction|work|isolation)\b)/im,
  /^\s*(prepare\s+transaction|commit\s+prepared|rollback\s+prepared)\b/im
];
const ADVISORY_LOCK_ID = "7640120251";

export class MigrationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MigrationError";
    this.code = code;
  }
}

const pad = version => String(version).padStart(4, "0");
const brief = migration => ({ version: migration.version, name: migration.name, file: migration.file });

export function redact(text, url) {
  let out = String(text);
  const secrets = [url];
  try {
    const parsed = new URL(url);
    if (parsed.password) secrets.push(parsed.password, decodeURIComponent(parsed.password));
  } catch { /* not a URL; nothing more to redact */ }
  for (const secret of secrets) if (secret) out = out.split(secret).join("<redacted>");
  return out;
}

export function discoverMigrations(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") throw new MigrationError("NO_MIGRATIONS_DIR", `Migrations directory not found: ${path.basename(dir)}`);
    throw error;
  }
  const files = [];
  const seen = new Set();
  for (const entry of entries) {
    if (!entry.name.endsWith(".sql")) continue;
    if (!entry.isFile()) throw new MigrationError("INVALID_MIGRATION_FILE", `${entry.name} must be a regular file`);
    const match = FILE_RE.exec(entry.name);
    if (!match) throw new MigrationError("INVALID_MIGRATION_NAME", `${entry.name} must match NNNN_snake_case_name.sql`);
    const version = Number(match[1]);
    if (seen.has(version)) throw new MigrationError("DUPLICATE_VERSION", `Duplicate migration version ${pad(version)}`);
    seen.add(version);
    const buffer = fs.readFileSync(path.join(dir, entry.name));
    if (buffer.length === 0 || buffer.length > MAX_MIGRATION_BYTES) throw new MigrationError("INVALID_MIGRATION_FILE", `${entry.name} must be between 1 byte and ${MAX_MIGRATION_BYTES} bytes`);
    if (buffer.includes(0)) throw new MigrationError("INVALID_MIGRATION_FILE", `${entry.name} contains a NUL byte`);
    const sql = buffer.toString("utf8");
    if (TRANSACTION_CONTROL.some(re => re.test(sql))) throw new MigrationError("TRANSACTION_CONTROL", `${entry.name} must not contain transaction control statements; the CLI wraps each migration in one transaction`);
    files.push({ version, name: match[2], file: entry.name, sql, checksum: crypto.createHash("sha256").update(buffer).digest("hex") });
  }
  return files.sort((a, b) => a.version - b.version);
}

export function planMigrations(files, applied) {
  const byVersion = new Map(files.map(file => [file.version, file]));
  for (const row of applied) {
    const file = byVersion.get(row.version);
    if (!file) throw new MigrationError("MISSING_APPLIED_MIGRATION", `Applied migration ${pad(row.version)}_${row.name} has no file in the migrations directory`);
    if (file.name !== row.name) throw new MigrationError("NAME_MISMATCH", `Migration ${pad(row.version)} was applied as "${row.name}" but the file is named "${file.name}"`);
    if (file.checksum !== row.checksum) throw new MigrationError("CHECKSUM_MISMATCH", `Applied migration ${pad(row.version)}_${row.name} was modified after it was applied`);
  }
  const appliedVersions = new Set(applied.map(row => row.version));
  const maxApplied = applied.reduce((max, row) => Math.max(max, row.version), 0);
  const pending = files.filter(file => !appliedVersions.has(file.version));
  const outOfOrder = pending.find(file => file.version < maxApplied);
  if (outOfOrder) throw new MigrationError("OUT_OF_ORDER", `Migration ${pad(outOfOrder.version)}_${outOfOrder.name} is older than the latest applied migration (${pad(maxApplied)}); migrations are forward-only`);
  return { applied: files.filter(file => appliedVersions.has(file.version)), pending };
}

export async function assertMigratorIdentity(client) {
  const { rows } = await client.query(
    `SELECT current_user AS current_user_name, session_user AS session_user_name,
            r.rolsuper, r.rolbypassrls, r.rolcreaterole, r.rolcreatedb, r.rolreplication
       FROM pg_catalog.pg_roles r
      WHERE r.rolname = current_user`
  );
  const row = rows[0];
  const safe = row
    && row.current_user_name === MIGRATOR_ROLE
    && row.session_user_name === MIGRATOR_ROLE
    && !row.rolsuper && !row.rolbypassrls && !row.rolcreaterole && !row.rolcreatedb && !row.rolreplication;
  if (!safe) throw new MigrationError("UNSAFE_MIGRATOR_ROLE", `Migrations must run as the ${MIGRATOR_ROLE} role without superuser, BYPASSRLS, CREATEROLE, CREATEDB or REPLICATION privileges`);
}

export async function connectMigrator(url, { Client } = {}) {
  if (typeof url !== "string" || !/^postgres(ql)?:\/\//.test(url)) throw new MigrationError("INVALID_MIGRATOR_URL", "VIBE_MIGRATOR_URL must be a postgres:// connection string");
  const PgClient = Client ?? await (async () => {
    const mod = await import("pg");
    return mod.default?.Client ?? mod.Client;
  })();
  const client = new PgClient({ connectionString: url, application_name: "vibe-cli-migrate", connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await assertMigratorIdentity(client);
  } catch (error) {
    try { await client.end(); } catch { /* already closed */ }
    if (error instanceof MigrationError) throw error;
    throw new MigrationError("CONNECTION_FAILED", `Could not connect as the migrator: ${redact(error.message, url)}`);
  }
  return client;
}

function assertTable(table) {
  if (!TABLE_RE.test(table)) throw new MigrationError("INVALID_TRACKING_TABLE", "Tracking table must be a lower-case schema.table name");
  return table;
}

async function rollbackQuietly(client) {
  try { await client.query("ROLLBACK"); } catch { /* connection may already be gone */ }
}

async function readApplied(client, table) {
  const { rows: exists } = await client.query("SELECT to_regclass($1) IS NOT NULL AS present", [table]);
  if (!exists[0]?.present) return [];
  const { rows } = await client.query(`SELECT version, name, checksum FROM ${table} ORDER BY version`);
  return rows.map(row => ({ version: Number(row.version), name: row.name, checksum: row.checksum }));
}

async function ensureTrackingTable(client, table) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [ADVISORY_LOCK_ID]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${table} (
         version integer PRIMARY KEY,
         name text NOT NULL,
         checksum text NOT NULL,
         applied_at timestamptz NOT NULL DEFAULT now(),
         applied_by name NOT NULL DEFAULT current_user
       )`
    );
    await client.query("COMMIT");
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  }
}

async function applyMigration(client, table, migration) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [ADVISORY_LOCK_ID]);
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '120s'");
    const { rows: existing } = await client.query(`SELECT checksum FROM ${table} WHERE version = $1`, [migration.version]);
    if (existing.length) {
      if (existing[0].checksum !== migration.checksum) throw new MigrationError("CHECKSUM_MISMATCH", `Applied migration ${pad(migration.version)}_${migration.name} was modified after it was applied`);
      await client.query("ROLLBACK");
      return false;
    }
    const { rows: before } = await client.query("SELECT transaction_timestamp()::text AS ts");
    await client.query(migration.sql);
    const { rows: after } = await client.query("SELECT transaction_timestamp()::text AS ts");
    if (before[0].ts !== after[0].ts) throw new MigrationError("TRANSACTION_CONTROL", `Migration ${pad(migration.version)}_${migration.name} ended its transaction early; changes made before that point may have been committed and must be inspected manually`);
    await client.query(`INSERT INTO ${table} (version, name, checksum) VALUES ($1, $2, $3)`, [migration.version, migration.name, migration.checksum]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await rollbackQuietly(client);
    if (error instanceof MigrationError) throw error;
    throw new MigrationError("MIGRATION_FAILED", `Migration ${pad(migration.version)}_${migration.name} failed and was rolled back: ${error.message}`);
  }
}

export async function migrationStatus(client, { dir, table = DEFAULT_TRACKING_TABLE }) {
  assertTable(table);
  const plan = planMigrations(discoverMigrations(dir), await readApplied(client, table));
  return { applied: plan.applied.map(brief), pending: plan.pending.map(brief) };
}

export async function verifyMigrations(client, options) {
  const status = await migrationStatus(client, options);
  return { ok: true, applied: status.applied.length, pending: status.pending.length };
}

export async function runMigrations(client, { dir, table = DEFAULT_TRACKING_TABLE, dryRun = false }) {
  assertTable(table);
  const plan = planMigrations(discoverMigrations(dir), await readApplied(client, table));
  if (dryRun) return { dryRun: true, applied: plan.applied.map(brief), pending: plan.pending.map(brief) };
  const result = { dryRun: false, applied: [], skipped: [] };
  if (!plan.pending.length) return result;
  await ensureTrackingTable(client, table);
  for (const migration of plan.pending) {
    const didApply = await applyMigration(client, table, migration);
    (didApply ? result.applied : result.skipped).push(brief(migration));
  }
  return result;
}

export function scaffoldMigration(dir, name) {
  if (!NAME_RE.test(name)) throw new MigrationError("INVALID_MIGRATION_NAME", "Migration name must be lower_snake_case");
  fs.mkdirSync(dir, { recursive: true });
  const existing = discoverMigrations(dir);
  const version = (existing.at(-1)?.version ?? 0) + 1;
  const file = `${pad(version)}_${name}.sql`;
  fs.writeFileSync(path.join(dir, file), `-- Migration ${pad(version)}: ${name.replace(/_/g, " ")}\n-- Runs as vibe_migrator inside one transaction. Do not add BEGIN/COMMIT.\n`, { flag: "wx", mode: 0o644 });
  return file;
}
