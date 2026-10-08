import {createPrivateKey,sign} from "node:crypto";

const privateKey=createPrivateKey(`-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIHWFIyFtSlqXbY7OHg1bxgjVC8xisczckCNjbcdto5K9
-----END PRIVATE KEY-----`);

export const TEST_CAPABILITY_KEY_ID="stage-test-2026";
export const TEST_CAPABILITY_ISSUER="leruchi-test-control-plane";
export const TEST_CAPABILITY_PUBLIC_KEYS=Object.freeze({
  [TEST_CAPABILITY_KEY_ID]:"MCowBQYDK2VwAyEAiMVGMY/24AIfhf68FhNA+CnQFLjVJTOU1GTRuH7g3NI="
});
export const TEST_CAPABILITY_PUBLIC_KEYS_JSON=JSON.stringify(TEST_CAPABILITY_PUBLIC_KEYS);

export function signTestCapabilityGrant({sub="test-actor",tenant_id="tenant_a",capabilities=["graph:read"],jti="test-grant",scope,exp=Math.floor(Date.now()/1000)+300,nbf,iss=TEST_CAPABILITY_ISSUER,aud="leruchi"}={}){
  const header={alg:"EdDSA",typ:"JWT",kid:TEST_CAPABILITY_KEY_ID};
  const payload={iss,sub,jti,tenant_id,capabilities,aud,exp,...(nbf===undefined?{}:{nbf}),...(scope===undefined?{}:{scope})};
  const enc=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const input=enc(header)+"."+enc(payload);
  return input+"."+sign(null,Buffer.from(input),privateKey).toString("base64url");
}
