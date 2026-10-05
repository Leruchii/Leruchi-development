  };
}

test("executes graph and vector branches under one trusted retrieval contract",async()=>{
  const calls=[];
  const result=await executeRetrieval({ir,context,catalog:{},requestParameters:{embedding:[1,0,0]},db:{},...deps(calls)});
  assert.equal(result.count,1);
  assert.equal(result.rows[0].candidate_id,"g1");
  assert.equal(result.cost.total,7);
  assert.deepEqual(result.explain.fusion,{strategy:"weighted_rrf",vector_weight:1,graph_weight:1});
  assert.deepEqual(result.explain.candidate_limits,{max_results:2,max_cost:40});
  assert.deepEqual(calls.map(x=>x[0]),["graph","vector"]);
});

test("selects the capability-registered recursive compiler when explicitly preferred",async()=>{
  const calls=[];
  let selected;
  const result=await executeRetrieval({
    ir:{...ir,sources:{...ir.sources,vector:undefined}},
    context,catalog:{},requestParameters:{},db:{},
    ...deps(calls),
    compile:()=>{selected="age";return {};},
    executeGraph:async args=>{args.compile({});calls.push(["graph"]);return {columns:["id"],rows:[{id:"g1"}],count:1};},
    retrievalCapabilities:{
      "apache-age":{available:true,features:["graph_query"]},
      "postgresql-recursive":{available:true,features:["graph_query"]},
      "postgresql-vector":{available:false,features:[]}
    },
    preferredGraphEngines:["postgresql-recursive"]
  });
  assert.equal(result.plan.graph,"postgresql-recursive");
  assert.equal(selected,undefined);
  assert.deepEqual(calls.map(x=>x[0]),["graph"]);
});

test("rejects combined cost before any branch executes",async()=>{
  const calls=[];
  const expensive={...ir,limits:{max_results:2,max_cost:6}};
  await assert.rejects(()=>executeRetrieval({ir:expensive,context,catalog:{},requestParameters:{embedding:[1,0,0]},db:{},...deps(calls)}),/Combined retrieval exceeds/);
  assert.deepEqual(calls,[]);
});

test("requires the vector query parameter before execution",async()=>{
  const calls=[];
  await assert.rejects(()=>executeRetrieval({ir,context,catalog:{},requestParameters:{},db:{},...deps(calls)}),/Vector query parameter is missing/);
  assert.deepEqual(calls,[]);
});

test("fails closed for untrusted execution context",async()=>{
  await assert.rejects(()=>executeRetrieval({ir,context:{...context,trusted:false},catalog:{},requestParameters:{embedding:[1,0,0]},db:{},...deps([])}),/Trusted execution context/);
});