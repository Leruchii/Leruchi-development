import {test,expect} from "@playwright/test";
import {signTestCapabilityGrant} from "../../../../tests/fixtures/capability-grant-test-key.mjs";

function token(tenant_id:string){
  return signTestCapabilityGrant({sub:"stage-13-studio",jti:"stage-13-studio-"+tenant_id,tenant_id,capabilities:["graph:read"]});
}

test("Studio proxy composes authenticated Graph API results from PostgreSQL/AGE/RLS",async({page,context})=>{
  await context.addCookies([{name:"leruchi_access_token",value:token("vibe_tenant_a"),url:"http://127.0.0.1:3100"}]);
  const catalog=page.waitForResponse(response=>response.url().endsWith("/api/studio/catalog")&&response.status()===200);
  await page.goto("/");
  await catalog;
  await page.getByRole("button",{name:"Run exploration"}).click();
  await expect(page.getByText("2 authorized nodes")).toBeVisible();
  await expect(page.getByRole("button",{name:"A1 Account"})).toBeVisible();
  await expect(page.getByRole("button",{name:"A2 Account"})).toBeVisible();
  await expect(page.getByRole("button",{name:"B1 Account"})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"B2 Account"})).toHaveCount(0);
  await expect(page.getByText("Only authenticated Graph API results are rendered")).toBeVisible();
});
