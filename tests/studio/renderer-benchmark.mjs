import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";

const nodeCount=1000;
const edgeCount=3000;
const nodes=Array.from({length:nodeCount},(_,i)=>({id:String(i),x:i%40,y:Math.floor(i/40)}));
const edges=Array.from({length:edgeCount},(_,i)=>({from:i%nodeCount,to:(i*17+13)%nodeCount}));
const start=performance.now();
const svg=nodes.map(n=>`<circle cx="${n.x}" cy="${n.y}" data-id="${n.id}"/>`).join("")+
  edges.map(e=>`<line x1="${e.from%40}" y1="${Math.floor(e.from/40)}" x2="${e.to%40}" y2="${Math.floor(e.to/40)}"/>`).join("");
const elapsed=performance.now()-start;
assert.equal(nodes.length,nodeCount);
assert.equal(edges.length,edgeCount);
assert.ok(svg.length>0);
console.log(JSON.stringify({nodes:nodeCount,edges:edgeCount,serialization_ms:Number(elapsed.toFixed(2))}));
