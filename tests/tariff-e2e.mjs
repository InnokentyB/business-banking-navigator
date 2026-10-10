import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createAppServer} from '../app/server.mjs';
const server=createAppServer({env:{DATA_FILE:''}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
try{
 const page=await browser.newPage();page.setDefaultTimeout(3000);await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByText('Fictional example loaded.').waitFor();await page.locator('#dataMode').selectOption('research');await page.getByText('Research session started.').waitFor();
 await page.locator('#needLegalForm').selectOption('Lda');await page.locator('#goal-team_cards').check();await page.locator('#needsDetails > summary').click();await page.locator('#needSepaPayments').fill('31');
 await page.locator('#assessNeeds').click();await page.getByText('Banking options assessed.').waitFor();
 const prices=page.locator('.selection-option').filter({has:page.getByRole('heading',{name:'Qonto',exact:true})}).locator('.tariff-details');await prices.locator('summary').click();
 assert.match(await prices.innerText(),/€9.20/);assert.match(await prices.innerText(),/€108.00/);assert.match(await prices.innerText(),/excluding VAT/);assert.match(await prices.innerText(),/Known subtotal/);
 await page.locator('#needSepaPayments').fill('32');assert.equal(await page.locator('.tariff-details').count(),0);
 await page.locator('#assessNeeds').click();await page.getByText('Banking options assessed.').waitFor();await page.reload();await page.getByText('Demo session restored.',{exact:false}).waitFor();assert.equal(await page.locator('#needSepaPayments').inputValue(),'32');
 await page.setViewportSize({width:390,height:844});await prices.locator('summary').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'artifacts/tariffs-mobile.png',fullPage:true});await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'artifacts/tariffs-desktop.png',fullPage:true});
 console.log('Tariff E2E passed: scenario subtotal, annual billing, exclusions, dirty state, restoration, mobile.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
