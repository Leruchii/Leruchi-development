import test from "node:test";
import assert from "node:assert/strict";
import {compilePostgresqlRecursive} from "../../packages/compiler-postgresql-recursive/index.mjs";

const catalog={graphs:{vibe_stage01:{labels:["Person"],edges:[{name:"KNOWS",from:"Person",to:"Person"}],relational:{labels:{Person:{schema:"vibe_app",table:"people",id_column:"id",tenant_column:"tenant_id"}},edges:{KNOWS:{schema:"vibe_app",table:"person_knows",from_column:"from_id",to_column:"to_id"}}}}}};
const ir={version:"v1",kind:"graph_query",graph:"vibe_stage01",root:{label:"Person",alias:"person"},steps:[{edge:"KNOWS",direction:"out",target:{label:"Person",alias:"friend"}}],filters:[{field:"person.name",op:"eq",value:{param:"name"}}],projection:[{field:"friend.name",alias:"friend_name"}],orderBy:[{field:"friend.name",direction:"asc"}],limit:25,offset:0,depth:1,parameters:[{name:"name",type:"string",required:true}]};

test("compiles Query IR to recursive PostgreSQL",()=>{const c=compilePostgresqlRecursive(ir,catalog);assert.equal(c.engine,"postgresql-recursive");assert.match(c.sql,/WITH RECURSIVE walk/);assert.match(c.sql,/vibe_app\.person_knows/);assert.match(c.sql,/vibe_app\.people/);assert.match(c.sql,/current_setting/);assert.doesNotMatch(c.sql,/\$name/);assert.deepEqual(c.parameterNames,["name"]);});
test("requires explicit relational mapping",()=>assert.throws(()=>compilePostgresqlRecursive(ir,{graphs:{vibe_stage01:{labels:["Person"],relational:{labels:{Person:{schema:"vibe_app",table:"people",id_column:"id"}}},edges:[]}}}),/MISSING_RELATIONAL_EDGE_MAPPING/));
test("does not accept engine-specific fragments",()=>assert.throws(()=>compilePostgresqlRecursive({...ir,extensions:{sql:"DROP TABLE x"}},catalog),/UNSUPPORTED/));
