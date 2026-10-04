import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const page=await readFile(new URL("../../apps/studio/app/page.tsx",import.meta.url),"utf8");

test("Graph Studio renders only authenticated query results",()=>{
  assert.match(page,/fetch\("\/api\/studio\/query"/);
  assert.match(page,/const displayNodes=liveNodes/);
  assert.doesNotMatch(page,/name:"Ada"|name:"Grace"|name:"Lin"|name:"Margaret"|name:"Evelyn"/);
  assert.doesNotMatch(page,/const nodes:Node\[\]=/);
  assert.match(page,/No authorized nodes returned/);
});
