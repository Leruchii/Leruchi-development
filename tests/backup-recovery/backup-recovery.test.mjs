import test from "node:test";
import assert from "node:assert/strict";
import {createBackupManifest,verifyBackupManifest,sha256FileBytes} from "../../packages/backup-recovery/index.mjs";

test("backup manifest is deterministic and records measured timing metadata",()=>{
  const bytes=Buffer.from("Leruchi-backup-fixture");
  const sha256=sha256FileBytes(bytes);
  const manifest=createBackupManifest({
    artifact:"fixture.dump",
    createdAt:"2026-10-05T00:00:00Z",
    bytes:bytes.byteLength,
    backupDurationMs:17,
    serverVersion:"17.11",
    pgDumpVersion:"17.11",
    migrationDigest:"abc",
    sha256
  });
  assert.equal(manifest.version,"v1");
  assert.equal(manifest.sha256,sha256);
  assert.equal(manifest.backup_duration_ms,17);
  assert.deepEqual(verifyBackupManifest(manifest,bytes),{ok:true,sha256});
});

test("restore verification rejects tampered backup bytes",()=>{
  const bytes=Buffer.from("good");
  const manifest=createBackupManifest({
    artifact:"fixture.dump",createdAt:"2026-10-05T00:00:00Z",bytes:bytes.byteLength,
    backupDurationMs:1,serverVersion:"17.11",pgDumpVersion:"17.11",migrationDigest:"abc",
    sha256:sha256FileBytes(bytes)
  });
  assert.deepEqual(verifyBackupManifest(manifest,Buffer.from("tampered")),{ok:false,code:"CHECKSUM_MISMATCH"});
});

test("restore verification rejects size mismatch even when content hash is replaced",()=>{
  const bytes=Buffer.from("good");
  const manifest=createBackupManifest({
    artifact:"fixture.dump",createdAt:"2026-10-05T00:00:00Z",bytes:99,
    backupDurationMs:1,serverVersion:"17.11",pgDumpVersion:"17.11",migrationDigest:"abc",
    sha256:sha256FileBytes(bytes)
  });
  assert.deepEqual(verifyBackupManifest(manifest,bytes),{ok:false,code:"SIZE_MISMATCH"});
});
