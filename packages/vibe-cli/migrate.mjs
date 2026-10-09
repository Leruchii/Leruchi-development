import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {execFile} from "node:child_process";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);

function isNumberedMigration(name) {
  const prefix = name.slice(0, 4);
  const rest = name.slice(5, -4);
  return name.endsWith(".sql") && prefix.length === 4
    && [...prefix].every(char => char >= "0" && char <= "9")
    && name[4] === "-" && rest.length > 0
    && [...rest].every(char => /[a-z0-9-]/.test(char));
}

const MAX_MIGRATION_BYTES = 1024 * 1024;

function stripNonExecutableSql(sql) {
  return sql
    .replace(/\$[A-Za-z_][A-Za-z0-9_]*\$[\s\S]*?\$[A-Za-z_][A-Za-z0-9_]*\$/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ");
}

function hasTopLevelTransactionControl(sql) {
  const executable = stripNonExecutableSql(sql);
  return /(?:^|;)\s*(?:BEGIN(?:\s+(?:TRANSACTION|WORK))?|COMMIT(?:\s+(?:TRANSACTION|WORK))?|ROLLBACK(?:\s+(?:TRANSACTION|WORK))?|ABORT|START\s+TRANSACTION|PREPARE\s+TRANSACTION|COMMIT\s+PREPARED|ROLLBACK\s+PREPARED)\s*(?:;|$)/im.test(executable);
}

export function validateMigrationFile(file) {
  const filename = typeof file === "string" ? file : file?.file;
  if (!filename) throw new TypeError("migration file path is required");
  const info = fs.lstatSync(filename);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("Migration must be a regular, non-symlink file");
  if (info.size === 0 || info.size > MAX_MIGRATION_BYTES) throw new Error(`Migration must be between 1 byte and ${MAX_MIGRATION_BYTES} bytes`);
  const buffer = fs.readFileSync(filename);
  if (buffer.includes(0)) throw new Error("Migration contains a NUL byte");
  const sql = buffer.toString("utf8");
  if (hasTopLevelTransactionControl(sql)) throw new Error("Migration must not contain transaction-control statements; the runner owns the transaction boundary");
  return { buffer, sql, checksum: createHash("sha256").update(buffer).digest("hex") };
}

export function listMigrationFiles(root) {
  const rootInfo = fs.lstatSync(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("Migration directory must be a real directory, not a symlink");
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.name.endsWith(".sql"))
    .map(entry => {
      if (!entry.isFile()) throw new Error(`Migration entry must be a regular file: ${entry.name}`);
      if (!isNumberedMigration(entry.name)) throw new Error(`Invalid migration filename: ${entry.name}`);
      const file = path.join(root, entry.name);
      validateMigrationFile(file);
      return {name: entry.name, id: entry.name.slice(0, -4), file};
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function migrationChecksum(file) {
  const filename = typeof file === "string" ? file : file?.file;
  if (!filename) throw new TypeError("migration file path is required");
  return validateMigrationFile(filename).checksum;
}

function requireMigratorUrl() {
  const value = process.env.LERUCHI_MIGRATOR_DATABASE_URL ?? process.env.VIBE_MIGRATOR_DATABASE_URL;
  if (!value) throw new Error("LERUCHI_MIGRATOR_DATABASE_URL is required for migrations (legacy VIBE_MIGRATOR_DATABASE_URL is supported)");
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error("LERUCHI_MIGRATOR_DATABASE_URL must be a valid PostgreSQL URL"); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname) throw new Error("LERUCHI_MIGRATOR_DATABASE_URL must be a valid PostgreSQL URL");
  if (parsed.username !== "vibe_migrator") throw new Error("Migrations require a database URL authenticated as the configured migration role (legacy role: vibe_migrator)");
  return value;
}
async function psql(url, args) {
  return execFileAsync("psql", ["-X", "--no-password", "-v", "ON_ERROR_STOP=1", "-d", url, ...args], {
    env: {...process.env, PGPASSWORD: undefined}
  });
}

function sqlLiteral(value) {
  return "'" + value.replaceAll("'", "''") + "'";
}

async function recordChecksum(url, migrationId, checksum) {
  if (!/^[0-9a-f]{64}$/.test(checksum)) throw new TypeError("migration checksum must be SHA-256 hex");
  if (!/^[0-9]{4}-[a-z0-9-]+$/.test(migrationId)) throw new TypeError("migration id has an invalid format");
  await psql(url, [
    "-c",
    `UPDATE vibe_meta.schema_migrations SET checksum = ${sqlLiteral(checksum)} WHERE migration_id = ${sqlLiteral(migrationId)}`
  ]);
}

async function assertMigratorIdentity(url) {
  const { stdout } = await psql(url, ["-At", "-F", "\\t", "-c", "SELECT current_user, session_user, rolsuper::text, rolbypassrls::text, rolcreaterole::text, rolcreatedb::text, rolreplication::text FROM pg_catalog.pg_roles WHERE rolname = current_user"]);
  const fields = stdout.trim().split("\\t");
  const safe = fields.length === 7 && fields[0] === "vibe_migrator" && fields[1] === "vibe_migrator" && fields.slice(2).every(value => value === "false" || value === "f");
  if (!safe) throw new Error("Migrations require current_user and session_user to be vibe_migrator without superuser, BYPASSRLS, CREATEROLE, CREATEDB or REPLICATION privileges");
}

export async function runMigrations({cwd=process.cwd(), migrationsDir=path.join(cwd,"infra","migrations")}={}) {
  const url = requireMigratorUrl();
  await assertMigratorIdentity(url);
  if (!fs.existsSync(migrationsDir)) throw new Error("Migration directory not found");
  const files = listMigrationFiles(migrationsDir);
  if (!files.length) throw new Error("No numbered migrations found");

  const bootstrap = files[0];
  if (bootstrap.id !== "0000-migration-ledger") {
    throw new Error("Migration history must begin with 0000-migration-ledger.sql");
  }

  await psql(url, ["--single-transaction", "-f", bootstrap.file]);

  const {stdout} = await psql(url, [
    "-At",
    "-F", "\t",
    "-c", "SELECT migration_id, COALESCE(checksum, '') FROM vibe_meta.schema_migrations ORDER BY migration_id"
  ]);
  const ledger = new Map(
    stdout.split("\n").map(line => line.trimEnd()).filter(Boolean).map(line => {
      const [id, checksum=""] = line.split("\t");
      return [id, checksum];
    })
  );
  const byId = new Map(files.map(file => [file.id, file]));

  for (const [id, storedChecksum] of ledger) {
    const file = byId.get(id);
    if (!file) throw new Error(`Applied migration is missing from repository: ${id}`);
    const expected = migrationChecksum(file);
    if (storedChecksum && storedChecksum !== expected) {
      throw new Error(`Migration checksum mismatch: ${id}`);
    }
    if (!storedChecksum) {
      await recordChecksum(url, id, expected);
      ledger.set(id, expected);
    }
  }

  const applied = new Set(ledger.keys());
  const latestApplied = [...applied].sort().at(-1);
  const pending = files.filter(file => !applied.has(file.id));
  if (latestApplied) {
    const outOfOrder = pending.find(file => file.id < latestApplied);
    if (outOfOrder) throw new Error(`Out-of-order migration refused: ${outOfOrder.id} is older than latest applied migration ${latestApplied}`);
  }
  for (const migration of pending) {
    await psql(url, ["--single-transaction", "-f", migration.file]);
    await recordChecksum(url, migration.id, migrationChecksum(migration));
  }

  return {applied: [...applied], migrated: pending.map(file => file.id)};
}
