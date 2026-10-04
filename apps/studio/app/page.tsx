"use client";

import {useEffect,useMemo,useState} from "react";

type Node={id:string;label:string;x:number;y:number;name:string};
type Graph={visibility:"shared"|"tenant";tenantId:string|null;labels:string[];edges:{name:string;from:string|null;to:string|null;properties:Record<string,unknown>}[]};
type Catalog={version:string;graphs:Record<string,Graph>};

export default function GraphStudio(){
  const [selected,setSelected]=useState<string>("1");
  const [view,setView]=useState<"explorer"|"schema"|"traversal">("explorer");
  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [catalogError,setCatalogError]=useState("");
  const [selectedGraph,setSelectedGraph]=useState("");
  const [selectedLabel,setSelectedLabel]=useState("");
  const [rows,setRows]=useState<Record<string,unknown>[]>([]);
  const [queryError,setQueryError]=useState("");
  const [requestId,setRequestId]=useState("");
  const [loading,setLoading]=useState(false);
  const [traversalEdge,setTraversalEdge]=useState("");
  useEffect(()=>{let cancelled=false;fetch("/api/studio/catalog",{cache:"no-store"}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body?.error?.message??"Schema Catalog request failed");if(!cancelled){setCatalog(body);const first=Object.keys(body.graphs??{})[0]??"";setSelectedGraph(first);setSelectedLabel(body.graphs?.[first]?.labels?.[0]??"");setTraversalEdge(body.graphs?.[first]?.edges?.[0]?.name??"")}}).catch(error=>{if(!cancelled)setCatalogError(error.message)});return()=>{cancelled=true}},[]);
  const graph=catalog?.graphs?.[selectedGraph];
  const liveNodes:Node[]=rows.map((row,index)=>({id:String(row.id??row._id??index+1),label:selectedLabel,x:12+(index%8)*11,y:18+Math.floor(index/8)*13,name:String(row.name??"node")}));
  const displayNodes=liveNodes;
  const runExplorer=async()=>{if(!selectedGraph||!selectedLabel)return;setLoading(true);setQueryError("");try{const response=await fetch("/api/studio/query",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ir:{version:"v1",kind:"graph_query",graph:selectedGraph,root:{label:selectedLabel,alias:"root"},steps:[],filters:[],projection:[{field:"root.name",alias:"name"}],orderBy:[],limit,offset:0,depth:0,parameters:[]},parameters:{}})});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message??"Graph query failed");setRows(body.rows??[]);setRequestId(body.request_id??"")}catch(error){setRows([]);setQueryError(error instanceof Error?error.message:"Graph query failed")}finally{setLoading(false)}};
  const [depth,setDepth]=useState(2);
  const [limit,setLimit]=useState(100);
  const [theme,setTheme]=useState<"dark"|"light">("dark");
  const current=useMemo(()=>displayNodes.find(n=>n.id===selected)??displayNodes[0]??null,[selected,displayNodes]);
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
        <button className={view==="explorer"?"nav-item active":"nav-item"} onClick={()=>setView("explorer")}>Graph Explorer</button>
        <button className={view==="schema"?"nav-item active":"nav-item"} onClick={()=>setView("schema")}>Graph Schema</button>
        <button className={view==="traversal"?"nav-item active":"nav-item"} onClick={()=>setView("traversal")}>Traversal Builder</button>
        <div className="section-divider"/>
        <div className="section-title">SCHEMA CATALOG</div>
        {catalog ? Object.entries(catalog.graphs).map(([name,item])=><button className="catalog-group" key={name} onClick={()=>{setSelectedGraph(name);setSelectedLabel(item.labels[0]??"")}}><strong>{name}</strong><span>{item.visibility} · {item.labels.length} labels · {item.edges.length} edges</span></button>) : <div className="catalog-group"><strong>Loading…</strong><span>Awaiting authenticated catalog</span></div>}
      </aside>
      <section id="workspace" className="workspace" aria-label="Graph Studio workspace">
        <div className="workspace-head">
          <div><p className="eyebrow">{view==="explorer"?"GRAPH EXPLORER":view==="schema"?"GRAPH SCHEMA":"TRAVERSAL BUILDER"}</p><h1>{view==="explorer"?"Explore your graph":view==="schema"?"Understand your graph contract":"Build a bounded traversal"}</h1><p className="subtle">{catalog?"Live Schema Catalog metadata. Authorization and execution remain server-side.":"Loading the authenticated Schema Catalog…"}</p></div>
          <div className="controls">
            <label>Graph<select value={selectedGraph} onChange={e=>{const next=e.target.value;setSelectedGraph(next);setSelectedLabel(catalog?.graphs?.[next]?.labels?.[0]??"");setRows([]);setQueryError("")}}>{Object.keys(catalog?.graphs??{}).map(g=><option key={g}>{g}</option>)}</select></label>
            <label>Label<select value={selectedLabel} onChange={e=>{setSelectedLabel(e.target.value);setRows([]);setQueryError("")}}>{graph?.labels.map(l=><option key={l}>{l}</option>)}</select></label>
            <label>Limit<select value={limit} onChange={e=>setLimit(Number(e.target.value))}>{[100,250,500,1000].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <button className="primary" onClick={runExplorer} disabled={loading}>{loading?"Running…":"Run exploration"}</button>
          </div>
        </div>
        {catalogError&&<div className="state error" role="alert"><strong>Schema Catalog unavailable.</strong><span>{catalogError}</span><button className="secondary" onClick={()=>location.reload()}>Retry</button></div>}
        {view==="explorer"&&<div className="canvas-grid">
          <section className="graph-panel" aria-label="Graph visualization">
            <div className="panel-toolbar"><span>{displayNodes.length} authorized nodes</span><span>tenant-authorized · cap {limit}</span><div><button aria-label="Fit graph">Fit</button><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button></div></div>
            {loading?<div className="state"><strong>Running authorized graph query…</strong><span>Results are filtered by the authenticated tenant context on the server.</span></div>:!catalog&&!catalogError?<div className="state"><strong>Loading Schema Catalog…</strong><span>Waiting for the authenticated project schema.</span></div>:catalog&&!rows.length&&!queryError?<div className="state"><strong>No authorized nodes returned.</strong><span>Run the exploration to query this tenant's data, or verify that the selected label has data.</span></div>:<svg className="graph-canvas" viewBox="0 0 100 100" role="img" aria-label={selectedLabel+" nodes returned by the authorized graph query"}>
              {displayNodes.map(n=><g key={n.id} onClick={()=>setSelected(n.id)} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setSelected(n.id)}} role="button" aria-label={n.name+" "+n.label}>
                <circle cx={n.x} cy={n.y} r={selected===n.id?5:4} className={selected===n.id?"node selected":"node"}/><text x={n.x} y={n.y+1} className="node-id">{n.id}</text><text x={n.x} y={n.y+9} className="node-name">{n.name}</text>
              </g>)}
            </svg>
            <div className="canvas-footer"><span>Layout: bounded canvas</span><span>Only authenticated Graph API results are rendered</span></div>
          </section>
          <aside className="inspector" aria-label="Selection inspector">
            {current?<><div className="inspector-head"><div><p className="eyebrow">SELECTED NODE</p><h2>{current.name}</h2></div><span className="badge">{current.label}</span></div>
            <dl className="properties"><div><dt>ID</dt><dd><code>{current.id}</code><button aria-label="Copy node ID">Copy</button></dd></div><div><dt>Name</dt><dd>{current.name}</dd></div><div><dt>Tenant</dt><dd>derived by server context</dd></div></dl>
            <div className="inspector-section"><h3>Relationships</h3><p className="subtle">Relationship expansion is available through the structured Traversal Builder.</p></div>
            <button className="secondary" onClick={()=>setView("traversal")}>Open Traversal Builder</button></>:<div className="state"><strong>No node selected.</strong><span>Run an authorized exploration to inspect returned data.</span></div>}
          </aside>
        </div>}
        {view==="schema"&&<div className="schema-grid">{graph?<><section className="schema-card"><p className="eyebrow">GRAPH</p><h2>{selectedGraph}</h2><span className="badge">{graph.visibility}</span><h3>Vertex labels</h3>{graph.labels.map(label=><div className="schema-row" key={label}><strong>{label}</strong><span>label</span></div>)}</section><section className="schema-card"><p className="eyebrow">RELATIONSHIPS</p><h2>Edge types</h2>{graph.edges.map(edge=><div className="schema-row" key={edge.name}><strong>{edge.name}</strong><span>{edge.from} → {edge.to}</span></div>)}</section></>:<div className="state">Select a graph from the Schema Catalog.</div>}</div>}
        {view==="traversal"&&<div className="traversal-grid"><section className="builder-card"><p className="eyebrow">STRUCTURED REQUEST</p><label>Start label<select value={selectedLabel} onChange={e=>setSelectedLabel(e.target.value)}>{graph?.labels.map(l=><option key={l}>{l}</option>)}</select></label><label>Edge<select value={traversalEdge} onChange={e=>setTraversalEdge(e.target.value)}>{graph?.edges.map(e=><option key={e.name}>{e.name}</option>)}</select></label><label>Depth<select value={depth} onChange={e=>setDepth(Number(e.target.value))}>{[1,2,3,4,5,6].map(v=><option key={v}>{v}</option>)}</select></label></section><section className="result-card"><p className="eyebrow">QUERY SPECIFICATION</p><pre>{JSON.stringify({version:"v1",graph:selectedGraph,root:{label:selectedLabel},steps:[{edge:traversalEdge,direction:"out",target:{label:selectedLabel}}],depth,limit},null,2)}</pre><p className="subtle">Structured requests are validated and compiled server-side. No free-form Cypher editor is exposed.</p></section><section className="result-card"><p className="eyebrow">EXECUTION PLAN</p><div className="plan-row"><span>Engine</span><strong>server-selected</strong></div><div className="plan-row"><span>Authorization</span><strong>tenant + graph:read</strong></div><div className="plan-row"><span>Depth</span><strong>{depth} / 6</strong></div><div className="plan-row"><span>Result cap</span><strong>{limit} / 1000</strong></div></section></div>}
        {queryError&&<div className="state error" role="alert"><strong>Graph request failed.</strong><span>{queryError}</span><span>Request ID: {requestId||"not returned"}</span><button className="secondary" onClick={runExplorer}>Retry</button></div>}
        <div className="statusbar"><span className="status-dot"/><span>{catalog?"Schema Catalog connected":"Connecting to Schema Catalog…"}</span>{requestId&&<span className="request-id">request_id: {requestId}</span>}</div>
      </section>
    </div>
  </main>;
}
