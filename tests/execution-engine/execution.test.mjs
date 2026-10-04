import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Client } from "pg";
import { compileAge } from "../../packages/compiler-age/index.mjs";
import { validateQuery } from "../../packages/query-validation/index.mjs";
import { ExecutionError, executeGraphQuery, createPgExecutor } from "../../packages/execution-engine/index.mjs";
import { createExecutionContext } from "../../packages/execution-context/index.mjs";

const ir = JSON.parse(fs.readFileSync("packages/execution-engine/fixture.json","utf8"));
const catalog = JSON.parse(fs.readFileSync("packages/execution-engine/catalog-fixture.json","utf8"));
const baseContext = createExecutionContext({ tenant_id:"vibe_tenant_a", role:"authenticated", capabilities:["graph:read"] });

function fakeDb({ fail = false } = {}) {
  const calls = [];
  return {
    calls,
    async begin(){ calls.push("BEGIN"); },
    async execute(compiled, params){ calls.push(["EXECUTE", compiled.sql, params]); if(fail) throw new Error("secret database detail"); return { rows:[["A1","A2"]] }; },
    async commit(){ calls.push("COMMIT"); },
    async rollback(){ calls.push("ROLLBACK"); }
  };
}

test("validation failure executes zero database calls", async () => {
  const db = fakeDb();
  await assert.rejects(() => executeGraphQuery({
    ir:{...ir,graph:"missing"}, context:baseContext, catalog, requestParameters:{name:"A1"},
    validate:validateQuery, compile:compileAge, db
  }), error => error.code === "VALIDATION_FAILED");
  assert.deepEqual(db.calls, []);
});

test("successful execution commits and normalizes rows", async () => {
  const db = fakeDb();
  const result = await executeGraphQuery({
    ir, context:baseContext, catalog, requestParameters:{name:"A1"},
    validate:validateQuery, compile:compileAge, db
  });
  assert.deepEqual(db.calls.map(call => Array.isArray(call) ? call[0] : call), ["BEGIN","EXECUTE","COMMIT"]);
  assert.deepEqual(result.rows, [{account_name:"A1",friend_name:"A2"}]);
});

test("execution failure rolls back and hides database details", async () => {
  const db = fakeDb({fail:true});
  await assert.rejects(() => executeGraphQuery({
    ir, context:baseContext, catalog, requestParameters:{name:"A1"},
    validate:validateQuery, compile:compileAge, db
  }), error => {
    assert.equal(error.code, "DATABASE_EXECUTION_FAILED");
    assert.equal(error.message, "Query execution failed");
    assert.equal(error.details, undefined);
    return true;
  });
  assert.deepEqual(db.calls.map(call => Array.isArray(call) ? call[0] : call), ["BEGIN","EXECUTE","ROLLBACK"]);
});

test("missing parameters fail before transaction", async () => {
  const db = fakeDb();
  await assert.rejects(() => executeGraphQuery({
    ir, context:baseContext, catalog, requestParameters:{},
    validate:validateQuery, compile:compileAge, db
  }), error => error.code === "MISSING_PARAMETER");
  assert.deepEqual(db.calls, []);
});

test("real tenant A execution is isolated by PostgreSQL RLS", async (t) => {
  if (process.env.RUN_STAGE08_INTEGRATION !== "1") {
    t.skip("integration mode disabled");
    return;
  }
  const client = new Client({
    host:"127.0.0.1", port:5432, database:"vibedb",
    user:"vibe_tenant_a", password:"tenant-a-ci"
  });
  await client.connect();
  try {
    const db = createDbAdapter(client);
    const own = await executeGraphQuery({
      ir, context:baseContext, catalog, requestParameters:{name:"A1"},
      validate:validateQuery, compile:compileAge, db
    });
    assert.deepEqual(own.rows, [{account_name:"A1",friend_name:"A2"}]);

    const hidden = await executeGraphQuery({
      ir, context:baseContext, catalog, requestParameters:{name:"B1"},
      validate:validateQuery, compile:compileAge, db
    });
    assert.deepEqual(hidden.rows, []);
  } finally {
    await client.end();
  }
});

function createDbAdapter(client) {
  return {
    async begin(){ await client.query("BEGIN"); },
    async execute(compiled, parameterMap) {
      return client.query({
        name:"stage08-vibe-execution",
        text:compiled.sql,
        values:[JSON.stringify(parameterMap)],
        rowMode:"array"
      });
    },
    async commit(){ await client.query("COMMIT"); },
    async rollback(){ await client.query("ROLLBACK"); }
  };
}

test("PostgreSQL graph executor binds trusted JWT claims inside the transaction", async()=>{
  const queries=[];
  const client={query:async (...args)=>{queries.push(args);return {rows:[]};}};
  const db=createPgExecutor(client,createExecutionContext({tenant_id:"tenant_a",role:"authenticated",capabilities:["graph:read"]}));
  await db.begin();
  assert.equal(queries[0][0],"BEGIN");
  assert.equal(queries[1][0],"SELECT set_config($1, $2, true)");
  assert.deepEqual(JSON.parse(queries[1][1][1]),{
    tenant_id:"tenant_a",
    role:"authenticated",
    capabilities:["graph:read"]
  });
});
