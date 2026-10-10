import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createAppServer} from '../app/server.mjs';
import {mkdir} from 'node:fs/promises';
const server=createAppServer({env:{DATA_FILE:''}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByText('Fictional example loaded.').waitFor();
 assert.equal(await page.locator('#legalName').isVisible(),false,'Company details should be deferred');
 assert.equal(await page.locator('#followText').isVisible(),false,'Follow-up should be deferred');
 await page.locator('#dataMode').selectOption('research');await page.getByText('Research session started.').waitFor();
 await page.locator('#needLegalForm').selectOption('Lda');
 await page.locator('#goal-online').check();
 assert.equal(await page.locator('#priority-online').inputValue(),'preference');
 await page.locator('#assessNeeds').click();await page.getByText('Banking options assessed.').waitFor();
 await page.locator('.choose-option[data-route="qonto-pt-lda-online"]').click();await page.getByText('Option chosen.').waitFor();
 assert.equal(await page.locator('#preparation').getAttribute('open'),'');
 assert.equal(await page.locator('#followText').isVisible(),false);
 await page.locator('#companyDetails > summary').click();assert.equal(await page.locator('#legalName').isVisible(),true);
 await page.reload();await page.getByText('Demo session restored.',{exact:false}).waitFor();assert.equal(await page.locator('#goal-online').isChecked(),true);
 await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/guided-ux-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'artifacts/guided-ux-mobile.png',fullPage:true});
 console.log('Guided UX passed: deferred fields, goal synchronization, chosen route handoff, persistence, mobile.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
