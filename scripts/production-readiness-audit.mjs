import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const EXACT_VERSION=/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const FLOATING_PREFIX=/^[~^*><=]/;

export function isPinnedDependencyVersion(value){
  if(typeof value!=="string"||!value)return false;
  if(value.startsWith("file:"))return true;
  if(value.startsWith("workspace:"))return value!=="workspace:*";
  if(value==="latest"||value==="next"||FLOATING_PREFIX.test(value))return false;
  return EXACT_VERSION.test(value);
}

export function auditPackageManifest(file,manifest){
  const findings=[];
  for(const section of ["dependencies","devDependencies","optionalDependencies"]){
    for(const [name,version] of Object.entries(manifest[section]??{})){
      if(!isPinnedDependencyVersion(version)){
        findings.push({code:"UNPINNED_DEPENDENCY",file,dependency:name,version,section});
      }
    }
  }
  return findings;
}

export function auditMigrations(entries,read){
  const findings=[];
  const sql=entries.filter(name=>/^\d{4}-[a-z0-9-]+\.sql$/.test(name)).sort();
  if(sql.length===0)return [{code:"NO_MIGRATIONS"}];
  sql.forEach((name,index)=>{
    const expected=String(index).padStart(4,"0");
    const actual=name.slice(0,4);
    if(actual!==expected)findings.push({code:"MIGRATION_SEQUENCE_GAP",file:name,expected,actual});
    const body=read(name);
    const id=name.slice(0,-4);
    if(!body.includes("\\set ON_ERROR_STOP on"))findings.push({code:"MIGRATION_NO_FAIL_FAST",file:name});
    if(!/SET\s+lock_timeout\s*=\s*'[^']+'/i.test(body))findings.push({code:"MIGRATION_NO_LOCK_TIMEOUT",file:name});
    if(!/SET\s+statement_timeout\s*=\s*'[^']+'/i.test(body))findings.push({code:"MIGRATION_NO_STATEMENT_TIMEOUT",file:name});
    if(!/current_user\s*<>\s*'vibe_migrator'/i.test(body))findings.push({code:"MIGRATION_NO_MIGRATOR_GUARD",file:name});
    if(!body.includes(id))findings.push({code:"MIGRATION_LEDGER_ID_MISSING",file:name,id});
  });
  return findings;
}

export function auditDatabaseImage(dockerfile){
  const findings=[];
  const from=dockerfile.match(/^FROM\s+([^\s]+)$/m)?.[1]??"";
  if(!from||/:latest$/i.test(from)||!/:release_PG17_\d+\.\d+\.\d+$/.test(from)){
    findings.push({code:"DATABASE_BASE_IMAGE_NOT_VERSION_PINNED",value:from});
  }
  const vector=dockerfile.match(/^ARG\s+PGVECTOR_VERSION=(.+)$/m)?.[1]?.trim()??"";
  if(!EXACT_VERSION.test(vector))findings.push({code:"PGVECTOR_VERSION_NOT_PINNED",value:vector});
  if(!/PostgreSQL 17\.\d+ \+ Apache AGE \d+\.\d+\.\d+ \+ pgvector \d+\.\d+\.\d+/.test(dockerfile)){
    findings.push({code:"DATABASE_VERSION_LABEL_MISSING"});
  }
  return findings;
}

export function runReadinessAudit(root=process.cwd()){
  const findings=[];
  const packageFiles=[
    "package.json",
    "packages/graph-api/package.json",
    "packages/schema-catalog-api/package.json",
    "packages/vibe-cli/package.json",
    "packages/vibe-sdk/package.json",
    "apps/studio/package.json"
  ];
  for(const rel of packageFiles){
    const full=path.join(root,rel);
    if(!fs.existsSync(full)){findings.push({code:"PACKAGE_MANIFEST_MISSING",file:rel});continue;}
    findings.push(...auditPackageManifest(rel,JSON.parse(fs.readFileSync(full,"utf8"))));
  }

  const migrationsDir=path.join(root,"infra","migrations");
  if(!fs.existsSync(migrationsDir))findings.push({code:"MIGRATION_DIRECTORY_MISSING"});
  else findings.push(...auditMigrations(fs.readdirSync(migrationsDir),name=>fs.readFileSync(path.join(migrationsDir,name),"utf8")));

  const dockerfile=path.join(root,"infra","docker","postgres","Dockerfile");
  if(!fs.existsSync(dockerfile))findings.push({code:"DATABASE_DOCKERFILE_MISSING"});
  else findings.push(...auditDatabaseImage(fs.readFileSync(dockerfile,"utf8")));

  return {ok:findings.length===0,findings};
}

const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const result=runReadinessAudit();
  process.stdout.write(JSON.stringify({version:"v1",...result},null,2)+"\n");
  if(!result.ok)process.exitCode=1;
}
