import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"leruchi-backup-script-"));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const bin=path.join(root,"bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin,"pg_dump"), [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'if [[ "${1:-}" == "--version" ]]; then echo "pg_dump (PostgreSQL) 17.11"; exit 0; fi',
    'for arg in "$@"; do case "$arg" in --file=*) printf "backup-fixture-bytes" > "${arg#--file=}";; esac; done',
    ""
  ].join("\n"));
  fs.writeFileSync(path.join(bin,"psql"), [
    "#!/usr/bin/env bash",
    'if [[ "$*" == *"SHOW server_version"* ]]; then echo "17.11"; else echo "abc123"; fi',
    ""
  ].join("\n"));
  fs.chmodSync(path.join(bin,"pg_dump"),0o755);
  fs.chmodSync(path.join(bin,"psql"),0o755);
  const out=path.join(root,"out");
  return {root,bin,out};
}

function run(script,fx,extraEnv={}) {
  return spawnSync("bash",[path.resolve(script),fx.out],{
    encoding:"utf8",
    env:{...process.env,PATH:`${fx.bin}:${process.env.PATH}`,DATABASE_URL:"postgresql://example.invalid/vibedb",...extraEnv}
  });
}

test("canonical backup writes a verifiable Leruchi-named dump and manifest",t=>{
  const fx=fixture(t);
  const result=run("scripts/leruchi-backup.sh",fx);
  assert.equal(result.status,0,result.stderr);
  const manifestPath=result.stdout.trim();
  assert.match(path.basename(manifestPath),/^leruchi-.*\.manifest\.json$/);
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  const dumpPath=path.join(fx.out,manifest.artifact);
  const bytes=fs.readFileSync(dumpPath);
  assert.equal(manifest.sha256,createHash("sha256").update(bytes).digest("hex"));
  assert.equal(manifest.size_bytes,bytes.byteLength);
});

test("legacy backup path preserves the old filename prefix through the canonical implementation",t=>{
  const fx=fixture(t);
  const result=run("scripts/vibedb-backup.sh",fx);
  assert.equal(result.status,0,result.stderr);
  assert.match(path.basename(result.stdout.trim()),/^vibedb-.*\.manifest\.json$/);
});
