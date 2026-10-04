import {test,expect,type Page,type Route} from "@playwright/test";

const catalog={version:"v1",graphs:{vibe_security:{visibility:"shared",tenantId:null,labels:["Account"],edges:[{name:"KNOWS",from:"Account",to:"Account",properties:{}}]}}};

async function mockStudio(page:Page,names:string[]){
  await page.route("**/api/studio/catalog",(route:Route)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(catalog)}));
  await page.route("**/api/studio/query",(route:Route)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({version:"v1",request_id:"browser-test",columns:["name"],rows:names.map(name=>({name,id:name})),count:names.length})}));
}

test("tenant A browser session renders only tenant A graph results",async({page})=>{
  await mockStudio(page,["A1","A2"]);
  await page.goto("/");
  await page.getByRole("button",{name:"Run exploration"}).click();
  await expect(page.getByRole("button",{name:"A1 Account"})).toBeVisible();
  await expect(page.getByRole("button",{name:"A2 Account"})).toBeVisible();
  await expect(page.getByText("B1")).toHaveCount(0);
  await expect(page.getByText("B2")).toHaveCount(0);
});

test("tenant B browser session cannot render tenant A graph results",async({page})=>{
  await mockStudio(page,["B1","B2"]);
  await page.goto("/");
  await page.getByRole("button",{name:"Run exploration"}).click();
  await expect(page.getByRole("button",{name:"B1 Account"})).toBeVisible();
  await expect(page.getByRole("button",{name:"B2 Account"})).toBeVisible();
  await expect(page.getByText("A1")).toHaveCount(0);
  await expect(page.getByText("A2")).toHaveCount(0);
});

test("Graph Studio remains usable at mobile width and exposes keyboard-selectable graph nodes",async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await mockStudio(page,["A1"]);
  await page.goto("/");
  await page.getByRole("button",{name:"Run exploration"}).click();
  const node=page.getByRole("button",{name:"A1 Account"});
  await expect(node).toBeVisible();
  await node.focus();
  await expect(node).toBeFocused();
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(361);
  await page.getByRole("button",{name:"Toggle theme"}).click();
  await expect(page.locator("main.light")).toBeVisible();
});
