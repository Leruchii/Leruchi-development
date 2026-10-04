import {test,expect,type Page,type Route} from "@playwright/test";

const catalog={version:"v1",graphs:{vibe_security:{visibility:"shared",tenantId:null,labels:["Account"],edges:[{name:"KNOWS",from:"Account",to:"Account",properties:{}}]}}};

function rows(count:number){
  return Array.from({length:count},(_,index)=>({id:String(index+1),name:`node-${index+1}`}));
}

async function mockStudio(page:Page,count:number){
  await page.route("**/api/studio/catalog",(route:Route)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(catalog)}));
  await page.route("**/api/studio/query",(route:Route)=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({version:"v1",request_id:"renderer-benchmark",columns:["name"],rows:rows(count),count})}));
}

for(const count of [100,500,1000]){
  test(`SVG graph renderer handles ${count} nodes without catastrophic regression`,async({page})=>{
    await mockStudio(page,count);
    const catalogResponse=page.waitForResponse(response=>response.url().endsWith("/api/studio/catalog")&&response.status()===200);
    await page.goto("/");
    await catalogResponse;
    const start=await page.evaluate(()=>performance.now());
    await page.getByRole("button",{name:"Run exploration"}).click();
    await expect(page.locator("svg.graph-canvas g")).toHaveCount(count);
    const renderMs=await page.evaluate(startTime=>performance.now()-startTime,start);

    // Use a visible node for the interaction probe. The current canvas is bounded;
    // probing the final generated node would measure viewport clipping, not interaction latency.
    const interactionNode=page.getByRole("button",{name:"node-1 Account"});
    const interactionStart=await page.evaluate(()=>performance.now());
    await interactionNode.click();
    await expect(page.locator("svg.graph-canvas circle.node.selected")).toHaveCount(1);
    const interactionMs=await page.evaluate(startTime=>performance.now()-startTime,interactionStart);

    console.log(JSON.stringify({renderer:"svg-dom",nodes:count,edges:0,render_ms:Number(renderMs.toFixed(2)),interaction_ms:Number(interactionMs.toFixed(2))}));

    // CI is a regression guard, not a production performance SLA.
    expect(renderMs).toBeLessThan(5000);
    expect(interactionMs).toBeLessThan(5000);
  });
}
