import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {run} from "../../packages/leruchi-cli/index.mjs";

test("CLI agent evaluate sends the canonical cases file without inventing a second contract",async()=>{
  const cwd=fs.mkdtempSync(path.join(os.tmpdir(),"vibe-agent-eval-"));
  fs.mkdirSync(path.join(cwd,".vibe"));
  fs.writeFileSync(path.join(cwd,".vibe","config.json"),JSON.stringify({baseUrl:"https://example.test"}));
  const file=path.join(cwd,"cases.json");
  const cases=[{name:"case",plan:{version:"v1",kind:"cross_modal_plan",steps:[{id:"x",type:"query",ir:{version:"v1",kind:"graph_query"}}]},expected:{status:"rejected"}}];
  fs.writeFileSync(file,JSON.stringify(cases));
  let body;
  const out=[];
  const code=await run(["agent","evaluate","--cases",file],{cwd,stdout:v=>out.push(v),fetchImpl:async(url,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({status:"pass"}),{status:200,headers:{"content-type":"application/json"}})}});
  assert.equal(code,0);
  assert.deepEqual(body,{cases});
  assert.match(out[0],/"status":"pass"/);
});
