import assert from "node:assert/strict";
import {Pool} from "pg";
import {createTenantCatalogProvider} from "../../packages/schema-catalog-api/index.mjs";
import {createExecutionContext} from "../../packages/execution-context/index.mjs";
import {createPgExecutor} from "../../packages/execution-engine/index.mjs";
import {executeRetrieval} from "../../packages/retrieval-execution/index.mjs";

const adminUrl=process.env.LERUCHI_ADMIN_DATABASE_URL;
const runtimeUrl=process.env.LERUCHI_RUNTIME_DATABASE_URL;
if(!adminUrl||!runtimeUrl) throw new Error("LERUCHI_ADMIN_DATABASE_URL and LERUCHI_RUNTIME_DATABASE_URL are required");

const admin=new Pool({connectionString:adminUrl});
const runtime=new Pool({connectionString:runtimeUrl});

async function seed(){
  const client=await admin.connect();
  try{
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS vibe_app.stage15_hybrid_documents (
        id text PRIMARY KEY,
        tenant_id text NOT NULL,
        content text NOT NULL,
        embedding vector(3) NOT NULL
      )
    `);
    await client.query("ALTER TABLE vibe_app.stage15_hybrid_documents ENABLE ROW LEVEL SECURITY");
    await client.query("ALTER TABLE vibe_app.stage15_hybrid_documents FORCE ROW LEVEL SECURITY");
    await client.query("DROP POLICY IF EXISTS stage15_hybrid_documents_tenant ON vibe_app.stage15_hybrid_documents");
    await client.query(`
      CREATE POLICY stage15_hybrid_documents_tenant ON vibe_app.stage15_hybrid_documents
      FOR SELECT TO vibe_runtime
      USING (tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id',''))
    `);
    await client.query("GRANT SELECT ON vibe_app.stage15_hybrid_documents TO vibe_runtime");
    await client.query("DELETE FROM vibe_app.stage15_hybrid_documents WHERE id IN ('A1','A2','B1','B2')");
    await client.query(`
      INSERT INTO vibe_app.stage15_hybrid_documents(id,tenant_id,content,embedding) VALUES
      ('A1','vibe_tenant_a','A1 vector evidence','[1,0,0]'),
      ('A2','vibe_tenant_a','A2 vector evidence','[0.99,0.01,0]'),
      ('B1','vibe_tenant_b','B1 vector evidence','[1,0,0]'),
      ('B2','vibe_tenant_b','B2 vector evidence','[0.99,0.01,0]')
    `);
    await client.query("SET LOCAL ROLE vibe_migrator");
    await client.query("DELETE FROM vibe_meta.graph_catalog_registry WHERE graph_name='vibe_security' AND tenant_id=''");
    await client.query(`
      INSERT INTO vibe_meta.graph_catalog_registry
        (tenant_id,graph_name,object_kind,object_name,from_label,to_label,properties)
      VALUES
        ('','vibe_security','label','Account','','','{"name":"text","tenant_id":"text"}'),
        ('','vibe_security','edge','KNOWS','Account','Account','{"tenant_id":"text"}')
    `);
    await client.query("DELETE FROM vibe_meta.vector_catalog_registry WHERE catalog_ref='stage15.hybrid.embedding'");
    await client.query(`
      INSERT INTO vibe_meta.vector_catalog_registry
        (tenant_id,catalog_ref,schema_name,relation_name,embedding_column,key_column,content_column,dimensions,model,distance_metric)
      VALUES
        ('','stage15.hybrid.embedding','vibe_app','stage15_hybrid_documents','embedding','id','content',3,'stage15-test','cosine')
    `);
    await client.query("SELECT vibe_meta.refresh_schema_catalog()");
    await client.query("COMMIT");
  }catch(error){try{await client.query("ROLLBACK")}catch{};throw error}finally{client.release()}
}

function retrievalIr(){
  return {
    version:"v1",kind:"retrieval_query",
    sources:{
      vector:{catalog_ref:"stage15.hybrid.embedding",query_parameter:"embedding",top_k:2,identity_field:"id"},
      graph:{
        query:{
          version:"v1",kind:"graph_query",graph:"vibe_security",
          root:{label:"Account",alias:"n"},steps:[],filters:[],
          projection:[{field:"n.name",alias:"id"}],
          orderBy:[{field:"n.name",direction:"asc"}],
          limit:2,offset:0,depth:0,parameters:[]
        },
        candidate_limit:2,identity_field:"id"
      }
    },
    fusion:{strategy:"weighted_rrf",vector_weight:1,graph_weight:1},
    limits:{max_results:2,max_cost:40}
  };
}

async function runTenant(tenant,expected){
  const context=createExecutionContext({tenant_id:tenant,role:"authenticated",capabilities:["graph:read","vector:read"]});
  const provider=createTenantCatalogProvider(runtime);
  const catalog=await provider(context);
  assert.ok(catalog.graphs.vibe_security);
  assert.ok(catalog.vectors["stage15.hybrid.embedding"]);
  const client=await runtime.connect();
  const db=createPgExecutor(client,context);
  try{
    const result=await executeRetrieval({
      ir:retrievalIr(),
      context,
      catalog,
      requestParameters:{embedding:[1,0,0]},
      db
    });
    assert.deepEqual(result.rows.map(row=>row.candidate_id),expected,tenant);
    assert.equal(result.rows.some(row=>tenant==="vibe_tenant_a"?row.candidate_id.startsWith("B"):row.candidate_id.startsWith("A")),false,tenant);
    assert.ok(result.cost.total<=result.cost.max);
    return result;
  }finally{client.release()}
}

async function main(){
  await seed();
  const a=await runTenant("vibe_tenant_a",["A1","A2"]);
  const b=await runTenant("vibe_tenant_b",["B1","B2"]);
  assert.deepEqual(a.rows.map(row=>row.candidate_id),b.rows.map(row=>row.candidate_id).map(id=>id.replace("B","A")));
  console.log("stage15-hybrid-database-ok");
  await runtime.end();
  await admin.end();
}

main().catch(async error=>{console.error(error);try{await runtime.end()}catch{};try{await admin.end()}catch{};process.exitCode=1});
