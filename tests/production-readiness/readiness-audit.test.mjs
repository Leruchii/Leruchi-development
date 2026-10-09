import test from "node:test";
import assert from "node:assert/strict";
import {
  isPinnedDependencyVersion,
  auditPackageManifest,
  auditMigrations,
  auditDatabaseImage,
  runReadinessAudit
} from "../../scripts/production-readiness-audit.mjs";
import {migrationChecksum as computeMigrationChecksum} from "../../packages/leruchi-cli/migrate.mjs";
import {mkdtempSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

test("dependency policy accepts exact versions and local workspace links",()=>{
  assert.equal(isPinnedDependencyVersion("8.23.1"),true);
  assert.equal(isPinnedDependencyVersion("file:../local"),true);
  assert.equal(isPinnedDependencyVersion("^8.23.1"),false);
  assert.equal(isPinnedDependencyVersion("~8.23.1"),false);
  assert.equal(isPinnedDependencyVersion("latest"),false);
  assert.equal(isPinnedDependencyVersion("*"),false);
});

test("package audit identifies floating runtime and dev dependencies",()=>{
  const findings=auditPackageManifest("fixture/package.json",{
    dependencies:{pg:"^8.23.1",local:"file:../local"},
    devDependencies:{typescript:"5.8.3",playwright:"latest"}
  });
  assert.deepEqual(findings.map(x=>x.dependency),["pg","playwright"]);
});

test("migration policy rejects sequence gaps and missing operational guards",()=>{
  const bodies={
    "0000-first.sql":"\\set ON_ERROR_STOP on\nSET lock_timeout='5s';\nSET statement_timeout='30s';\nIF current_user <> 'vibe_migrator' THEN NULL; END IF;\n0000-first",
    "0002-third.sql":"SELECT 1"
  };
  const findings=auditMigrations(Object.keys(bodies),name=>bodies[name]);
  const codes=new Set(findings.map(x=>x.code));
  assert.equal(codes.has("MIGRATION_SEQUENCE_GAP"),true);
  assert.equal(codes.has("MIGRATION_NO_FAIL_FAST"),true);
  assert.equal(codes.has("MIGRATION_NO_LOCK_TIMEOUT"),true);
  assert.equal(codes.has("MIGRATION_NO_STATEMENT_TIMEOUT"),true);
  assert.equal(codes.has("MIGRATION_NO_MIGRATOR_GUARD"),true);
});

test("database image policy rejects floating AGE/pgvector versions",()=>{
  const findings=auditDatabaseImage("FROM apache/age:latest\nARG PGVECTOR_VERSION=main\n");
  assert.deepEqual(findings.map(x=>x.code),[
    "DATABASE_BASE_IMAGE_NOT_VERSION_PINNED",
    "PGVECTOR_VERSION_NOT_PINNED",
    "DATABASE_VERSION_LABEL_MISSING"
  ]);
});

test("migration checksum accepts descriptor objects as used by the runner",()=>{
  const root=mkdtempSync(join(tmpdir(),"vibedb-migration-checksum-"));
  const file=join(root,"0001-fixture.sql");
  writeFileSync(file,"fixture");
  const descriptor={name:"0001-fixture.sql",id:"0001-fixture",file};
  assert.equal(computeMigrationChecksum(descriptor),computeMigrationChecksum(file));
});

test("repository satisfies the Stage 20 version and migration policy",()=>{
  const result=runReadinessAudit();
  assert.deepEqual(result,{ok:true,findings:[]});
});
