import {test,expect} from "@playwright/test";

const catalogFor=(tenant)=>({
  version:"v1",
  graphs:{app:{visibility:"shared",tenantId:null,labels:["Person"],edges:[]}}
});

const rowsFor=(tenant)=>tenant==="tenant_a"
  ? [{id:"a1",name:"Ada"}]
  : [{id:"b1",name:"Grace"}];

async function boot(page,tenant){
  await page.context().addCookies([{name:"vibe_access_token",value:tenant,url:"http://127.0.0.1:3100"}]);
  await page.route("**/api/studio/catalog",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(catalogFor(tenant))}));
  await page.route("**/api/studio/query",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({version:"v1",rows:rowsFor(tenant),request_id:"browser-"+tenant})}));
  await page.goto("http://127.0.0.1:3100",{waitUntil:"networkidle"});
}

test.describe("authenticated Graph Studio browser contract",()=>{
  for(const viewport of [{width:360,height:800},{width:768,height:900},{width:1440,height:900}]){
    test(`renders without horizontal overflow at ${viewport.width}px`,async({page})=>{
      await page.setViewportSize(viewport);
      await boot(page,"tenant_a");
      await page.getByRole("button",{name:"Run exploration"}).click();
      await expect(page.getByRole("button",{name:"Ada Person"})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    });
  }

  test("tenant A and tenant B render different authorized results",async({browser})=>{
    const a=await browser.newPage({viewport:{width:1440,height:900}});
    await boot(a,"tenant_a");
    await a.getByRole("button",{name:"Run exploration"}).click();
    await expect(a.getByRole("button",{name:"Ada Person"})).toBeVisible();
    await expect(a.getByText("Grace")).toHaveCount(0);
    await a.close();

    const b=await browser.newPage({viewport:{width:1440,height:900}});
    await boot(b,"tenant_b");
    await b.getByRole("button",{name:"Run exploration"}).click();
    await expect(b.getByRole("button",{name:"Grace Person"})).toBeVisible();
    await expect(b.getByText("Ada")).toHaveCount(0);
    await b.close();
  });

  test("unauthenticated catalog failure is explicit",async({page})=>{
    await page.setViewportSize({width:1440,height:900});
    await page.route("**/api/studio/catalog",route=>route.fulfill({status:401,contentType:"application/json",body:JSON.stringify({error:{code:"UNAUTHORIZED",message:"Studio session is not authenticated"}})}));
    await page.goto("http://127.0.0.1:3100",{waitUntil:"networkidle"});
    await expect(page.locator(".state.error[role=alert]")).toContainText("Schema Catalog unavailable");
    await expect(page.getByText("Ada")).toHaveCount(0);
  });
});
