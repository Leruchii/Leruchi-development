import assert from "node:assert/strict";
import {Pool} from "pg";
import {createTenantCatalogProvider} from "../../packages/schema-catalog-api/index.mjs";
import {createExecutionContext} from "../../packages/execution-context/index.mjs";
import {createPgExecutor} from "../../packages/execution-engine/index.mjs";
import {executeVectorRetrieval} from "../../packages/vector-execution/index.mjs";

const adminUrl=process.env.VIBE_ADMIN_DATABASE_URL;
const runtimeUrl=process.env.VIBE_RUNTIME_DATABASE_URL;
if(!adminUrl||!runtimeUrl) throw new Error("VIBE_ADMIN_DATABASE_URL and VIBE_RUNTIME_DATABASE_URL are required");

const admin=new Pool({connectionString:adminUrl});
const runtime=new Pool({connectionString:runtimeUrl});

async function seed(){
  const client=await admin.connect();
  try{
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS vibe_app.stage15_documents (
        id text PRIMARY KEY,
        tenant_id text NOT NULL,
        content text NOT NULL,
        embedding vector(3) NOT NULL
      )
    `);
    await client.query("ALTER TABLE vibe_app.stage15_documents ENABLE ROW LEVEL SECURITY");
    await client.query("ALTER TABLE vibe_app.stage15_documents FORCE ROW LEVEL SECURITY");
    await client.query("DROP POLICY IF EXISTS stage15_documents_tenant ON vibe_app.stage15_documents");
    await client.query(`
      CREATE POLICY stage15_documents_tenant ON vibe_app.stage15_documents
      FOR SELECT TO vibe_runtime
      USING (tenant_id = COALESCE(current_setting('request.jwt.claims', true)::json ->> 'tenant_id',''))
    `);
    await client.query("GRANT SELECT ON vibe_app.stage15_documents TO vibe_runtime");
    await client.query("DELETE FROM vibe_app.stage15_documents WHERE id LIKE 'stage15-%'");
    await client.query(`
      INSERT INTO vibe_app.stage15_documents(id,tenant_id,content,embedding) VALUES
      ('stage15-a','tenant_a','A secret document','[1,0,0]'),
      ('stage15-b','tenant_b','B secret document','[0,1,0]')
    `);
    await client.query("SET LOCAL ROLE vibe_migrator");
    await client.query("DELETE FROM vibe_meta.vector_catalog_registry WHERE catalog_ref IN ('stage15.a.embedding','stage15.b.embedding')");
    await client.query(`
      INSERT INTO vibe_meta.vector_catalog_registry
        (tenant_id,catalog_ref,schema_name,relation_name,embedding_column,key_column,content_column,dimensions,model,distance_metric)
      VALUES
        ('tenant_a','stage15.a.embedding','vibe_app','stage15_documents','embedding','id','content',3,'test','cosine'),
        ('tenant_b','stage15.b.embedding','vibe_app','stage15_documents','embedding','id','content',3,'test','cosine')
    `);
    await client.query("SELECT vibe_meta.refresh_schema_catalog()");
    await client.query("COMMIT");
  }catch(error){try{await client.query("ROLLBACK")}catch{};throw error}finally{client.release()}
}

async function run(){
  await seed();
  const contextA=createExecutionContext({
    tenant_id:"tenant_a",
    role:"authenticated",
    capabilities:["vector:read"]
  });
  const provider=createTenantCatalogProvider(runtime);
  const catalogA=await provider(contextA);
  assert.ok(catalogA.vectors["stage15.a.embedding"]);
  assert.equal(catalogA.vectors["stage15.b.embedding"],undefined);

  const dbClient=await runtime.connect();
  const db=createPgExecutor(dbClient,contextA);
  try{
    const resultA=await executeVectorRetrieval({
      catalog:catalogA,catalogRef:"stage15.a.embedding",embedding:[1,0,0],topK:5,maxResults:20,maxCost:20,
      context:contextA,db
    });
    assert.equal(resultA.count,1);
    assert.equal(resultA.rows[0][0],"stage15-a");

    await assert.rejects(
      ()=>executeVectorRetrieval({
        catalog:catalogA,catalogRef:"stage15.b.embedding",embedding:[0,1,0],topK:5,maxResults:20,maxCost:20,
        context:contextA,db
      }),
      /not visible/
    );
  }finally{dbClient.release()}
  await runtime.end();
  await admin.end();
}

run().catch(async error=>{console.error(error);try{await runtime.end()}catch{};try{await admin.end()}catch{};process.exitCode=1});
