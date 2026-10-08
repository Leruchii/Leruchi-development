import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,mkdirSync,chmodSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";

const restoreScript=resolve("scripts/leruchi-restore.sh");

function fixture({declaredSize}={}){
  const root=mkdtempSync(join(tmpdir(),"leruchi-restore-mode-"));
  const bin=join(root,"bin");
  mkdirSync(bin);
  const dump=join(root,"backup.dump");
  const manifest=join(root,"backup.manifest.json");
  const log=join(root,"pg_restore.log");
  const bytes=Buffer.from("stage17-restore-fixture");
  writeFileSync(dump,bytes);
  const sha=createHash("sha256").update(bytes).digest("hex");
  writeFileSync(manifest,JSON.stringify({
    version:"v1",
    sha256:sha,
    size_bytes:declaredSize ?? bytes.byteLength
  },null,2));
  const fake=join(bin,"pg_restore");
  writeFileSync(fake,'#!/usr/bin/env bash\nprintf "%s\\n" "$*" > "$PG_RESTORE_LOG"\n');
  chmodSync(fake,0o755);
  return {root,bin,dump,manifest,log};
}

function run(mode,fx){
  return spawnSync("bash",[restoreScript,fx.dump,fx.manifest],{
    encoding:"utf8",
    env:{
      ...process.env,
      PATH:`${fx.bin}:${process.env.PATH}`,
      DATABASE_URL:"postgresql://example.invalid/leruchi",
      LERUCHI_RESTORE_MODE:mode,
      PG_RESTORE_LOG:fx.log
    }
  });
}

test("fresh restore mode never requests destructive cleanup",()=>{
  const fx=fixture();
  const result=run("fresh",fx);
  assert.equal(result.status,0,result.stderr);
  const args=readFileSync(fx.log,"utf8");
  assert.doesNotMatch(args,/--clean|--if-exists/);
  assert.match(args,/--no-owner/);
  assert.match(result.stdout,/"mode":"fresh"/);
});

test("replace restore mode explicitly cleans conflicting objects",()=>{
  const fx=fixture();
  const result=run("replace",fx);
  assert.equal(result.status,0,result.stderr);
  const args=readFileSync(fx.log,"utf8");
  assert.match(args,/--clean/);
  assert.match(args,/--if-exists/);
  assert.match(result.stdout,/"mode":"replace"/);
});

test("shell restore rejects manifest size mismatch before pg_restore",()=>{
  const fx=fixture({declaredSize:999});
  const result=run("fresh",fx);
  assert.equal(result.status,5);
  assert.match(result.stderr,/size mismatch/);
});
