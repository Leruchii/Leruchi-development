import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const ignored=new Set([".git","node_modules"]);
const forbidden=[
  /node-version:\s*20\b/gi,
  /FROM\s+node:20(?:\D|$)/gi,
  /NODE_VERSION\s*=\s*20\b/gi,
  /Node(?:\.js)?\s+20\b/gi
];

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignored.has(entry.name))continue;
    const p=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const hits=[];
for(const file of walk(root)){
  let text;
  try{text=fs.readFileSync(file,"utf8");}catch{continue;}
  for(const re of forbidden){
    if(re.test(text)){hits.push(path.relative(root,file));break;}
    re.lastIndex=0;
  }
}
if(hits.length){
  console.error("FORBIDDEN NODE 20 REFERENCES:");
  for(const hit of hits)console.error(" - "+hit);
  process.exit(1);
}
console.log("Node 20 policy check passed: no forbidden Node 20 references found.");
