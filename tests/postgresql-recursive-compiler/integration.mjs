import assert from "node:assert/strict";
import {Client} from "pg";
import {compilePostgresqlRecursive} from "../../packages/compiler-postgresql-recursive/index.mjs";

const admin=new Client({connectionString:process.env.ADMIN_DATABASE_URL});
const runtime=new Client({connectionString:process.env.DATABASE_URL});
await admin.connect(); await runtime.connect();

const schema="vibe_app";
const catalog={graphs:{stage21:{
  labels:["Person"],edges:[{name:"KNOWS",from:"Person",to:"Person"}],
  relational:{labels:{Person:{schema,table:"stage21_people",id_column:"id",tenant_column:"tenant_id"}},
             edges:{KNOWS:{schema,table:"stage21_person_knows",from_column:"from_id",to_column:"to_id"}}}
}}};

try{
 await admin.query("CREATE TABLE IF NOT EXISTS vibe_app.stage21_people (id integer PRIMARY KEY, tenant_id text NOT NULL, name text NOT NULL)");
 await admin.query("CREATE TABLE IF NOT EXISTS vibe_app.stage21_person_knows (from_id integer NOT NULL, to_id integer NOT NULL, PRIMARY KEY(from_id,to_id))");
 await admin.query("ALTER TABLE vibe_app.stage21_people ENABLE ROW LEVEL SECURITY");
 await admin.query("ALTER TABLE vibe_app.stage21_people FORCE ROW LEVEL SECURITY");
 await admin.query("ALTER TABLE vibe_app.stage21_person_knows ENABLE ROW LEVEL SECURITY");
 await admin.query("ALTER TABLE vibe_app.stage21_person_knows FORCE ROW LEVEL SECURITY");
 await admin.query("DROP POLICY IF EXISTS stage21_people_tenant ON vibe_app.stage21_people");
 await admin.query("CREATE POLICY stage21_people_tenant ON vibe_app.stage21_people FOR SELECT TO PUBLIC USING (tenant_id = current_setting('request.jwt.claims',true)::jsonb ->> 'tenant_id')");
 await admin.query("DROP POLICY IF EXISTS stage21_edges_tenant ON vibe_app.stage21_person_knows");
 await admin.query("CREATE POLICY stage21_edges_tenant ON vibe_app.stage21_person_knows FOR SELECT TO PUBLIC USING (EXISTS (SELECT 1 FROM vibe_app.stage21_people p WHERE p.id=from_id AND p.tenant_id=current_setting('request.jwt.claims',true)::jsonb ->> 'tenant_id') AND EXISTS (SELECT 1 FROM vibe_app.stage21_people p WHERE p.id=to_id AND p.tenant_id=current_setting('request.jwt.claims',true)::jsonb ->> 'tenant_id'))");
 await admin.query("GRANT SELECT ON vibe_app.stage21_people,vibe_app.stage21_person_knows TO vibe_runtime");
 await admin.query("TRUNCATE vibe_app.stage21_person_knows,vibe_app.stage21_people");
 await admin.query("INSERT INTO vibe_app.stage21_people VALUES (1,'tenant-a','Alice'),(2,'tenant-a','Bob'),(3,'tenant-a','Cara'),(4,'tenant-b','Mallory'),(5,'tenant-b','Nia')");
 await admin.query("INSERT INTO vibe_app.stage21_person_knows VALUES (1,2),(2,3),(4,5)");

 const ir={version:"v1",kind:"graph_query",graph:"stage21",root:{label:"Person",alias:"person"},
   steps:[{edge:"KNOWS",direction:"out",target:{label:"Person",alias:"friend"}},
          {edge:"KNOWS",direction:"out",target:{label:"Person",alias:"friend2"}}],
   filters:[{field:"person.name",op:"eq",value:{param:"name"}}],
   projection:[{field:"friend2.name",alias:"name"}],orderBy:[{field:"friend2.name",direction:"asc"}],
   limit:10,offset:0,depth:2,parameters:[{name:"name",type:"string",required:true}]};
 const compiled=compilePostgresqlRecursive(ir,catalog);

 async function run(tenant,name){
   await runtime.query("BEGIN");
   await runtime.query("SELECT set_config($1,$2,true)",["request.jwt.claims",JSON.stringify({tenant_id:tenant})]);
   const result=await runtime.query({text:compiled.sql,values:[JSON.stringify({name})],rowMode:"array"});
   await runtime.query("ROLLBACK");
   return result.rows.map(r=>r[0]);
 }
 assert.deepEqual(await run("tenant-a","Alice"),["Cara"]);
 assert.deepEqual(await run("tenant-b","Mallory"),[]);
 assert.deepEqual(await run("tenant-a","Alice' OR true --"),[]);
 const limited={...ir,limit:1};
 const limitedCompiled=compilePostgresqlRecursive(limited,catalog);
 await runtime.query("BEGIN");
 await runtime.query("SELECT set_config($1,$2,true)",["request.jwt.claims",JSON.stringify({tenant_id:"tenant-a"})]);
 const limitedResult=await runtime.query({text:limitedCompiled.sql,values:[JSON.stringify({name:"Alice"})],rowMode:"array"});
 await runtime.query("ROLLBACK");
 assert.equal(limitedResult.rowCount,1);
 console.log("stage21 recursive compiler database evidence: PASS");
} finally {await runtime.end();await admin.end();}
