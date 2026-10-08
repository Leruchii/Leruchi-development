import {createGraphApiServer} from "../packages/graph-api/index.mjs";
import {createControlPlaneRevocationVerifier} from "../packages/capability-policy/control-plane.mjs";
import {Pool} from "pg";

const secret=process.env.LERUCHI_JWT_SECRET;
const issuer=process.env.LERUCHI_CAPABILITY_ISSUER;
const controlPlaneUrl=process.env.LERUCHI_CAPABILITY_CONTROL_PLANE_URL;
const controlPlaneToken=process.env.LERUCHI_CAPABILITY_CONTROL_PLANE_TOKEN;
if(!secret)throw new Error("LERUCHI_JWT_SECRET is required");
if(!issuer)throw new Error("LERUCHI_CAPABILITY_ISSUER is required");
const isGrantRevoked=createControlPlaneRevocationVerifier({baseUrl:controlPlaneUrl,bearerToken:controlPlaneToken});
const port=Number(process.env.LERUCHI_GRAPH_API_PORT??"4100");
const connectionString=process.env.LERUCHI_RUNTIME_DATABASE_URL;
if(!connectionString)throw new Error("LERUCHI_RUNTIME_DATABASE_URL is required");
const pool=new Pool({connectionString});
const catalog={version:"v1",graphs:{vibe_security:{visibility:"shared",tenantId:null,labels:["Account"],edges:[{name:"KNOWS",from:"Account",to:"Account",properties:{}}]}}};

const api=createGraphApiServer({pool,jwtSecret:secret,jwtIssuer:issuer,jwtAudience:"leruchi",requireCapabilityGrant:true,isGrantRevoked,catalogProvider:async()=>catalog,port});
const address=await api.listen();
console.log("LERUCHI_GRAPH_API_URL=http://127.0.0.1:"+address.port);
const shutdown=async()=>{await api.close();await pool.end();process.exit(0)};
process.on("SIGINT",shutdown);
process.on("SIGTERM",shutdown);
