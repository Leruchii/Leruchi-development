import {createHash} from "node:crypto";

export function createBackupManifest({artifact,createdAt,bytes,backupDurationMs,serverVersion,pgDumpVersion,migrationDigest,sha256}){
  if(!artifact||!sha256)throw new Error("INVALID_BACKUP_MANIFEST");
  return Object.freeze({
    version:"v1",
    artifact,
    created_at:createdAt,
    sha256,
    size_bytes:bytes,
    backup_duration_ms:backupDurationMs,
    server_version:serverVersion,
    pg_dump_version:pgDumpVersion,
    migration_digest:migrationDigest
  });
}

export function sha256FileBytes(bytes){
  return createHash("sha256").update(bytes).digest("hex");
}

export function verifyBackupManifest(manifest,bytes){
  if(!manifest||manifest.version!=="v1")return {ok:false,code:"UNSUPPORTED_MANIFEST"};
  const actual=sha256FileBytes(bytes);
  if(actual!==manifest.sha256)return {ok:false,code:"CHECKSUM_MISMATCH"};
  if(Number.isFinite(manifest.size_bytes)&&bytes.byteLength!==manifest.size_bytes)return {ok:false,code:"SIZE_MISMATCH"};
  return {ok:true,sha256:actual};
}
