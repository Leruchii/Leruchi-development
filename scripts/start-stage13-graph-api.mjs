import {createGraphApiServer} from "../packages/graph-api/index.mjs";
import {Pool} from "pg";

const secret=process.env.LERUCHI_JWT_SECRET??"stage-13-e2e-secret";
const port=Number(process.env.LERUCHI_GRAPH_API_PORT??"4100");
const connectionString=process.env.LERUCHI_RUNTIME_DATABASE_URL??"postgresql://vibe_runtime:runtime@127.0.0.1:5432/leruchi";
const pool=new Pool({connectionString});
const catalog={version:"v1",graphs:{vibe_security:{visibility:"shared",tenantId:null,labels:["Account"],edges:[{name:"KNOWS",from:"Account",to:"Account",properties:{}}]}}};

const api=createGraphApiServer({pool,jwtSecret:secret,catalogProvider:async()=>catalog,port});
const address=await api.listen();
console.log(`LERUCHI_GRAPH_API_URL=http://127.0.0.1:${address.port}`);
const shutdown=async()=>{await api.close();await pool.end();process.exit(0)};
process.on("SIGINT",shutdown);
process.on("SIGTERM",shutdown);
