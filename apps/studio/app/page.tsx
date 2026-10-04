"use client";

import {useMemo,useState} from "react";

type Node={id:string;label:string;x:number;y:number;name:string};
type Edge={id:string;from:string;to:string;label:string};

const nodes:Node[]=[
  {id:"1",label:"Person",x:18,y:28,name:"Ada"},
  {id:"2",label:"Person",x:48,y:18,name:"Grace"},
  {id:"3",label:"Person",x:72,y:38,name:"Lin"},
  {id:"4",label:"Person",x:38,y:68,name:"Margaret"},
  {id:"5",label:"Person",x:78,y:72,name:"Evelyn"}
];
const edges:Edge[]=[
  {id:"e1",from:"1",to:"2",label:"KNOWS"},
  {id:"e2",from:"2",to:"3",label:"KNOWS"},
  {id:"e3",from:"1",to:"4",label:"KNOWS"},
  {id:"e4",from:"4",to:"5",label:"KNOWS"},
  {id:"e5",from:"3",to:"5",label:"KNOWS"}
];

export default function GraphStudio(){
  const [selected,setSelected]=useState<string>("1");
  const [depth,setDepth]=useState(2);
  const [limit,setLimit]=useState(100);
  const [theme,setTheme]=useState<"dark"|"light">("dark");
  const current=useMemo(()=>nodes.find(n=>n.id===selected)??nodes[0],[selected]);
  const themeClass=theme==="light"?"light":"";
  return <main className={themeClass}>
    <a className="skip" href="#workspace">Skip to workspace</a>
    <header className="topbar">
      <div className="brand"><span className="brand-mark">V</span><span>VibeDB</span></div>
      <button className="project" aria-label="Project switcher">acme-prod <span>⌄</span></button>
      <nav aria-label="Breadcrumb"><span>Projects</span><span>/</span><strong>Graph Studio</strong></nav>
      <div className="top-actions">
        <button className="icon-button" aria-label="Open command search">⌘ K</button>
        <button className="icon-button" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Toggle theme">{theme==="dark"?"☼":"◐"}</button>
        <button className="avatar" aria-label="Account menu">FK</button>
      </div>
    </header>
    <div className="app-shell">
      <aside className="rail" aria-label="Primary navigation">
        {["⌂","▣","◈","⚙"].map((item,i)=><button className={i===2?"rail-button active":"rail-button"} key={item} aria-label={["Home","Data","Graph Studio","Settings"][i]}>{item}</button>)}
      </aside>
      <aside className="section-nav">
        <div className="section-title">GRAPH STUDIO</div>
        <button className="nav-item active">Graph Explorer</button>
        <button className="nav-item">Graph Schema</button>
        <button className="nav-item">Traversal Builder</button>
        <div className="section-divider"/>
        <div className="section-title">GRAPH</div>
        <div className="catalog-group"><strong>vibe_stage01</strong><span>shared</span></div>
        <div className="catalog-group"><strong>Person</strong><span>label</span></div>
        <div className="catalog-group"><strong>KNOWS</strong><span>Person → Person</span></div>
      </aside>
      <section id="workspace" className="workspace" aria-label="Graph Explorer">
        <div className="workspace-head">
          <div><p className="eyebrow">GRAPH EXPLORER</p><h1>Explore your graph</h1><p className="subtle">Schema Catalog-backed graph exploration. Results remain tenant-authorized by the backend.</p></div>
          <div className="controls">
            <label>Depth<select value={depth} onChange={e=>setDepth(Number(e.target.value))}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <label>Limit<select value={limit} onChange={e=>setLimit(Number(e.target.value))}>{[100,250,500,1000].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <button className="primary">Run exploration</button>
          </div>
        </div>
        <div className="canvas-grid">
          <section className="graph-panel" aria-label="Graph visualization">
            <div className="panel-toolbar"><span>{nodes.length} visible nodes</span><span>depth {depth} · cap {limit}</span><div><button aria-label="Fit graph">Fit</button><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button></div></div>
            <svg className="graph-canvas" viewBox="0 0 100 100" role="img" aria-label="Graph visualization of Person nodes connected by KNOWS edges">
              {edges.map(e=>{const a=nodes.find(n=>n.id===e.from)!;const b=nodes.find(n=>n.id===e.to)!;return <g key={e.id}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="edge"/><text x={(a.x+b.x)/2} y={(a.y+b.y)/2-2} className="edge-label">{e.label}</text></g>})}
              {nodes.map(n=><g key={n.id} onClick={()=>setSelected(n.id)} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setSelected(n.id)}} role="button" aria-label={n.name+" "+n.label}>
                <circle cx={n.x} cy={n.y} r={selected===n.id?5:4} className={selected===n.id?"node selected":"node"}/><text x={n.x} y={n.y+1} className="node-id">{n.id}</text><text x={n.x} y={n.y+9} className="node-name">{n.name}</text>
              </g>)}
            </svg>
            <div className="canvas-footer"><span>Layout: force-directed</span><span>Live events refetch through Graph API</span></div>
          </section>
          <aside className="inspector" aria-label="Selection inspector">
            <div className="inspector-head"><div><p className="eyebrow">SELECTED NODE</p><h2>{current.name}</h2></div><span className="badge">{current.label}</span></div>
            <dl className="properties"><div><dt>ID</dt><dd><code>{current.id}</code><button aria-label="Copy node ID">Copy</button></dd></div><div><dt>Name</dt><dd>{current.name}</dd></div><div><dt>Tenant</dt><dd>derived by server context</dd></div></dl>
            <div className="inspector-section"><h3>Relationships</h3>{edges.filter(e=>e.from===current.id||e.to===current.id).map(e=><button className="relation" key={e.id} onClick={()=>setSelected(e.from===current.id?e.to:e.from)}><span>{e.label}</span><span>{e.from===current.id?"outgoing":"incoming"}</span></button>)}</div>
            <button className="secondary">Expand neighbours</button>
          </aside>
        </div>
        <div className="statusbar"><span className="status-dot"/>Connected to Graph API contract <span className="request-id">request_id: explorer-demo</span></div>
      </section>
    </div>
  </main>;
}
