import {performance} from "node:perf_hooks";

const NODE_COUNT=1000;
const EDGE_COUNT=3000;
const nodes=Array.from({length:NODE_COUNT},(_,i)=>({id:String(i),x:(i%50)*20,y:Math.floor(i/50)*20}));
const edges=Array.from({length:EDGE_COUNT},(_,i)=>({from:String(i%NODE_COUNT),to:String((i*17+31)%NODE_COUNT)}));

function renderSvg(ns,es){
  let out='<svg viewBox="0 0 1000 1000">';
  for(const e of es){const a=ns[Number(e.from)],b=ns[Number(e.to)];out+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;}
  for(const n of ns)out+=`<circle cx="${n.x}" cy="${n.y}" r="4" data-id="${n.id}"/>`;
  return out+'</svg>';
}
const samples=[];
for(let i=0;i<5;i++){const start=performance.now();const output=renderSvg(nodes,edges);samples.push(performance.now()-start);if(!output.includes('data-id="999"'))throw new Error('renderer benchmark output incomplete');}
const sorted=[...samples].sort((a,b)=>a-b);
const median=sorted[Math.floor(sorted.length/2)];
const p95=sorted[Math.floor(sorted.length*0.95)-1]??sorted.at(-1);
const result={renderer:"isolated-svg-string-baseline",nodes:NODE_COUNT,edges:EDGE_COUNT,samples_ms:samples.map(v=>Number(v.toFixed(3))),median_ms:Number(median.toFixed(3)),p95_ms:Number(p95.toFixed(3)),browser_fps:"not measured — browser harness required",decision:"SVG is accepted for the bounded Stage 13 node canvas; this synthetic benchmark does not establish production performance for visible edge topology."};
console.log(JSON.stringify(result,null,2));
if(median>100)process.exitCode=1;
