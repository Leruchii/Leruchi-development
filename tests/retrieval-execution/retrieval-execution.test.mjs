      "apache-age":{available:true,features:["graph_query"]},
      "postgresql-recursive":{available:true,features:["graph_query"]},
      "postgresql-vector":{available:false,features:[]}
    },
    preferredGraphEngines:["postgresql-recursive"]
  });
  assert.equal(result.plan.graph,"postgresql-recursive");
  assert.equal(selected,"recursive");
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