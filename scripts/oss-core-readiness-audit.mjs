import {execFileSync} from "node:child_process";
import {existsSync,readFileSync} from "node:fs";

const manifest=JSON.parse(readFileSync(new URL("../OSS_EXPORT_MANIFEST.json",import.meta.url),"utf8"));
const required=["README.md","LICENSE","CONTRIBUTING.md","SECURITY.md","package.json","docker-compose.yml"];
const privatePath=/(^|\/)(cloud|enterprise|control-plane|billing|metering|provisioning|fleet|internal)(\/|$)/i;

const run=(cmd,args)=>execFileSync(cmd,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"]});
const files=run("git",["ls-files","-z"]).split("\0").filter(Boolean);
const globToRegExp=(glob)=>new RegExp("^"+glob
  .replace(/[.+^$(){}|[\]\\]/g,"\\$&")
  .replace(/\*\*/g,"§DOUBLE§")
  .replace(/\*/g,"[^/]*")
  .replace(/§DOUBLE§/g,".*")+"$");
const includes=manifest.include.map(globToRegExp);
const excludes=manifest.exclude.map(globToRegExp);
const exportable=files.filter(f=>includes.some(r=>r.test(f)));
const uncovered=files.filter(f=>!includes.some(r=>r.test(f))&&!excludes.some(r=>r.test(f)));
const leaked=files.filter(f=>includes.some(r=>r.test(f))&&excludes.some(r=>r.test(f)));
const privateExport=exportable.filter(f=>privatePath.test(f));
const missing=required.filter(f=>!existsSync(f));
const errors=[...uncovered.map(f=>"unclassified tracked path: "+f),...leaked.map(f=>"path matches both include and exclude: "+f),...privateExport.map(f=>"private-looking path is exportable: "+f),...missing.map(f=>"required OSS release file missing from candidate: "+f)];

let pkg;
try{pkg=JSON.parse(readFileSync("package.json","utf8"));}catch{errors.push("package.json is not valid JSON");}
if(pkg?.engines?.node!==">=24 <25")errors.push("package.json must declare Node >=24 <25");

if(errors.length){
  console.error("OSS Core readiness audit failed:");
  for(const error of errors)console.error(" - "+error);
  process.exit(1);
}

console.log("OSS Core readiness audit passed.");
console.log("Export-eligible files:",exportable.length);
console.log("Required release files:",required.length);
