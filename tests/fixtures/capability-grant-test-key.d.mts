export const TEST_CAPABILITY_KEY_ID: string;
export const TEST_CAPABILITY_ISSUER: string;
export const TEST_CAPABILITY_PUBLIC_KEYS: Readonly<Record<string,string>>;
export const TEST_CAPABILITY_PUBLIC_KEYS_JSON: string;
export function signTestCapabilityGrant(options?: {
  sub?: string;
  tenant_id?: string;
  capabilities?: string[];
  jti?: string;
  scope?: {routes?: string[]; graphs?: string[]};
  exp?: number;
  nbf?: number;
  iss?: string;
  aud?: string;
}): string;
