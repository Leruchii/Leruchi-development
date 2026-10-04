import fs from "node:fs";
import path from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);

function isNumberedMigration(name) {
  const prefix = name.slice(0, 4);
  const rest = name.slice(5, -4);
  return name.endsWith(".sql")
    && prefix.length === 4
    && [...prefix].every(char => char >= "0" && char <= "9")
    && name[4] === "-"
    && rest.length > 0
    && [...rest].every(char => /[a-z0-9-]/.test(char));
}

export function listMigrationFiles(root) {
  return fs.readdirSync(root)
    .filter(isNumberedMigration)
    .sort()
    .map(name => ({name, id: name.slice(0, -4), file: path.join(root, name)}));
}

function requireMigratorUrl() {
  const value = process.env.VIBE_MIGRATOR_DATABASE_URL;
  if (!value) throw new Error("VIBE_MIGRATOR_DATABASE_URL is required for migrations");
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error("VIBE_MIGRATOR_DATABASE_URL must be a valid PostgreSQL URL"); }
  if (parsed.username !== "vibe_migrator") {
    throw new Error("Migrations require a database URL authenticated as vibe_migrator");
  }
  return value;
}

async function psql(url, args) {
  return execFileAsync("psql", ["-X", "--no-password", "-v", "ON_ERROR_STOP=1", "-d", url, ...args], {
    env: {...process.env, PGPASSWORD: undefined}
  });
}

export async function runMigrations({cwd=process.cwd(), migrationsDir=path.join(cwd,"infra","migrations")}={}) {
  const url = requireMigratorUrl();
  if (!fs.existsSync(migrationsDir)) throw new Error("Migration directory not found");
  const files = listMigrationFiles(migrationsDir);
  if (!files.length) throw new Error("No numbered migrations found");

  const bootstrap = files[0];
  if (bootstrap.id !== "0000-migration-ledger") {
    throw new Error("Migration history must begin with 0000-migration-ledger.sql");
  }

  await psql(url, ["--single-transaction", "-f", bootstrap.file]);
  const {stdout} = await psql(url, ["-At", "-c", "SELECT migration_id FROM vibe_meta.schema_migrations ORDER BY migration_id"]);
  const applied = new Set(stdout.split("\n").map(v => v.trim()).filter(Boolean));

  const pending = files.filter(file => !applied.has(file.id));
  for (const migration of pending) {
    await psql(url, ["--single-transaction", "-f", migration.file]);
  }

  return {applied: [...applied], migrated: pending.map(file => file.id)};
}
