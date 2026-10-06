import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const ignored=new Set([".git","node_modules"]);
const node20=String.fromCharCode(50)+"0";
const forbidden=[
  new RegExp("node-version:\\s*"+node20+"\\b","i"),
  new RegExp("FROM\\s+node:"+node20+"(?:\\D|$)","i"),
  new RegExp("NODE_VERSION\\s*=\\s*"+node20+"\\b","i"),
  new RegExp("Node(?:\\.js)?\\s+"+node20+"\\b","i")
];
function walk(dir){const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(ignored.has(entry.name))continue;const p=path.join(dir,entry.name);if(entry.isDirectory())out.push(...walk(p));else out.push(p);}return out;}
const hits=[];
for(const file of walk(root)){let source;try{source=fs.readFileSync(file,"utf8")}catch{continue}for(const re of forbidden){if(re.test(source)){hits.push(path.relative(root,file));break;}}}
if(hits.length){console.error("Forbidden legacy Node runtime references found:");for(const hit of hits)console.error(" - "+hit);process.exit(1);}
console.log("Runtime policy passed: no forbidden legacy Node runtime references found.");
