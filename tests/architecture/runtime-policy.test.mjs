import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const script=path.resolve("scripts/assert-runtime-policy.mjs");

function fixture(t,files){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"leruchi-runtime-policy-"));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(const [rel,content] of Object.entries(files)){
    const file=path.join(root,rel);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,content);
  }
  return root;
}
function run(root){
  return spawnSync(process.execPath,[script],{cwd:root,encoding:"utf8"});
}
const validFiles={
  ".nvmrc":"24\n",
  "package.json":JSON.stringify({engines:{node:">=24 <25"}}),
  "packages/graph-api/package.json":JSON.stringify({name:"@leruchi/graph-api",engines:{node:">=24 <25"}}),
  "packages/schema-catalog-api/package.json":JSON.stringify({name:"@leruchi/schema-catalog-api",engines:{node:">=24 <25"}}),
  "packages/leruchi-cli/package.json":JSON.stringify({name:"@leruchi/cli",engines:{node:">=24 <25"}}),
  "packages/leruchi-sdk/package.json":JSON.stringify({name:"@leruchi/sdk",engines:{node:">=24 <25"}}),
  "apps/studio/package.json":JSON.stringify({name:"@leruchi/studio",engines:{node:">=24 <25"}}),
  ".github/workflows/ci.yml":"steps:\n  - uses: actions/setup-node@v6\n    with:\n      node-version: 24\n",
  "infra/Dockerfile":"FROM node:24-alpine\n",
  "runtime.env":"NODE_VERSION=24\n"
};

test("runtime policy accepts a consistently pinned Node.js 24 project",t=>{
  const root=fixture(t,validFiles);
  const result=run(root);
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Node.js 24 is the only configured project runtime/);
});

test("runtime policy rejects a non-24 workflow runtime",t=>{
  const root=fixture(t,{...validFiles,".github/workflows/ci.yml":"steps:\n  - uses: actions/setup-node@v6\n    with:\n      node-version: 22\n"});
  const result=run(root);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/node-version 22/);
});

test("runtime policy rejects a non-24 Docker base image",t=>{
  const root=fixture(t,{...validFiles,"infra/Dockerfile":"FROM node:22-alpine\n"});
  const result=run(root);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/FROM node:22/);
});

test("runtime policy rejects a package engine outside Node.js 24",t=>{
  const root=fixture(t,{...validFiles,"package.json":JSON.stringify({engines:{node:">=22 <23"}})});
  const result=run(root);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/package.json must enforce the Node.js 24 runtime range/);
});

test("runtime policy rejects an incorrect .nvmrc pin",t=>{
  const root=fixture(t,{...validFiles,".nvmrc":"22\n"});
  const result=run(root);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/.nvmrc must pin Node.js 24/);
});

test("runtime policy rejects a non-24 engine in a nested product package",t=>{
  const root=fixture(t,{...validFiles,"packages/leruchi-sdk/package.json":JSON.stringify({name:"@leruchi/sdk",engines:{node:">=20 <25"}})});
  const result=run(root);
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/packages\/leruchi-sdk\/package.json: engines.node must be >=24 <25/);
});
