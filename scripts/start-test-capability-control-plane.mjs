import http from "node:http";

const expected=process.env.LERUCHI_CONTROL_PLANE_TOKEN;
if(!expected)throw new Error("LERUCHI_CONTROL_PLANE_TOKEN is required");
const revoked=new Set((process.env.LERUCHI_TEST_REVOKED_JTIS??"").split(",").filter(Boolean));
const server=http.createServer((req,res)=>{
  if(req.method!=="GET"||!/^\/v1\/capability-grants\/[^/]+\/revocation$/.test(req.url??"")){
    res.writeHead(404,{"content-type":"application/json"});return res.end(JSON.stringify({error:"not found"}));
  }
  if(req.headers.authorization!=="Bearer "+expected){
    res.writeHead(401,{"content-type":"application/json"});return res.end(JSON.stringify({error:"unauthorized"}));
  }
  const jti=decodeURIComponent((req.url??"").split("/")[3]??"");
  const isRevoked=revoked.has(jti);
  res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
  res.end(JSON.stringify({active:!isRevoked,revoked:isRevoked}));
});
const port=Number(process.env.LERUCHI_CONTROL_PLANE_PORT??"4101");
server.listen(port,"127.0.0.1",()=>process.stdout.write("test-control-plane-ready\n"));
