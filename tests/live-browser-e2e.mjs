// Explicitly opt-in: uses local Chromium, real API credits, synthetic evidence only.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createAppServer } from '../app/server.mjs';
import { inferWithNemotron } from '../app/adapters.mjs';
if (!process.argv.includes('--live') || !process.env.TAVILY_API_KEY || !process.env.NEBIUS_API_KEY) throw new Error('Explicit --live and both provider keys required.');
const server=createAppServer({infer:async args=>{let result; try {result=await inferWithNemotron(args);} catch(e) {await mkdir('artifacts',{recursive:true}); await writeFile('artifacts/live-browser-inference-error.json',JSON.stringify({code:e.code,reason:e.message})); throw e;} await mkdir('artifacts',{recursive:true}); await writeFile('artifacts/live-browser-proposals.json',JSON.stringify(result,null,2)); return result;},env:{...process.env,DATA_FILE:'',RATE_LIMIT:'500',LIVE_RATE_LIMIT:'50'}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const report={kind:'live-research-browser-e2e',sources:[],analysis:[],downloads:[],syntheticOnly:true};
try {
 const context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage(); page.setDefaultTimeout(60000);
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base); await page.getByText('Fictional example loaded.').waitFor();
  await page.locator('#preparation').evaluate(el=>el.open=true);await page.locator('#companyDetails').evaluate(el=>el.open=true);await page.locator('#followDetails').evaluate(el=>el.open=true);
 await page.locator('#sessionControls summary').click();
 await page.locator('#dataMode').selectOption('research'); await page.getByText('Research session started.').waitFor();
 await page.locator('.choose-route').evaluateAll(items=>items.forEach(item=>{if(!item.checked) item.click();}));
 for(const route of ['santander-pt-company-online','bpi-pt-company-documents']) {
  await page.locator('#sourceRoute').selectOption(route);
  const refreshed=page.waitForResponse(r=>r.url().endsWith('/api/sources/refresh') && r.request().method()==='POST');
  await page.locator('#refreshSources').click(); const data=await (await refreshed).json();
  assert.equal(data.mode,'live-tavily');
  await mkdir('artifacts',{recursive:true}); await writeFile(`artifacts/live-browser-sources-${route}.json`,JSON.stringify(data,null,2));
  const candidate=data.candidates.find(c=>c.eligible && (route.startsWith('santander')?c.source.content.includes('RCBE'):c.source.content.includes('CCRC')));
  assert.ok(candidate,'Reviewable route text must contain its published requirements.');
  report.sources.push({routeId:route,url:candidate.source.url,contentHash:candidate.source.contentHash,retrievedAt:candidate.source.retrievedAt});
  await page.locator(`.candidate-select[data-candidate="${candidate.id}"]`).click();
  const rows=page.locator('.requirement-row');
  for(let i=0;i<await rows.count();i++) {
   const id=await rows.nth(i).locator('.req-id').inputValue();
   const supported=route.startsWith('santander') || ['BPI-CCRC','BPI-REP-ID','BPI-CORP-ID','BPI-REP-TAX','BPI-REP-ADDRESS','BPI-REP-INCOME'].includes(id);
   if(supported) await rows.nth(i).locator('.req-source').selectOption(candidate.source.id);
  }
  if(route.startsWith('bpi')) {
   // Reviewer confirms profession evidence applies in this synthetic scenario;
   // ownership declaration stays linked to the separately checked landing page.
   await page.locator('.advanced-review summary').click();
   const lines=JSON.parse(await page.locator('#reviewRequirements').inputValue());
   for(const r of lines) if(r.id==='BPI-REP-INCOME') { delete r.condition; r.label='Representative profession evidence: published examples include payslip, employer card or professional card'; }
   await page.locator('#reviewRequirements').fill(JSON.stringify(lines));
  }
  await page.locator('#approveSource').click(); await page.getByText('Reviewed source saved.').waitFor();
 }
 for(const type of ['crc_access_code','rcbe_access_code','online_identity_access','ownership_declaration','corporate_id_card','representative_tax_id','representative_address','representative_income']) {
  await page.locator('#newEvidenceType').selectOption(type); await page.locator('#newEvidence').fill(`Synthetic ${type}`); await page.locator('#addEvidence').click();
 }
 const analyzed=page.waitForResponse(r=>r.url().endsWith('/api/analyze') && r.request().method()==='POST');
 await page.locator('#analyze').click(); const analysis=await (await analyzed).json();
 await writeFile('artifacts/live-browser-analysis.json',JSON.stringify(analysis,null,2));
 assert.equal(analysis.mode,'live-model',JSON.stringify(analysis)); assert.equal(analysis.packages.length,9);
 for(const routeId of ['cgd-pt-company-branch','novobanco-pt-lda-documents','qonto-pt-lda-online','revolut-pt-business-online']) {
  const pkg=analysis.packages.find(p=>p.routeId===routeId); assert.equal(pkg.status,'needs_review'); assert.equal(pkg.routeEligibility.status,'check_directly'); assert.equal(pkg.items.at(-1).status,'uncertain');
 }
 report.analysis=analysis.packages.map(p=>({routeId:p.routeId,status:p.status,eligibility:p.routeEligibility.status,requirementsVersion:p.requirementsVersion}));
 const bpi=analysis.packages.find(p=>p.routeId.startsWith('bpi'));
 assert.equal(bpi.status,'ready');
 const santander=analysis.packages.find(p=>p.routeId.startsWith('santander'));
 assert.ok(['not_supported_by_published_route','check_directly'].includes(santander.routeEligibility.status));
 await page.locator('#exportRoute').selectOption(santander.routeId); assert.equal(await page.locator('#approve').isDisabled(),true);
 let download=page.waitForEvent('download'); await page.locator('#draftExport').click(); let file=await download;
 let payload=JSON.parse(await readFile(await file.path(),'utf8')); assert.equal(payload.packageSnapshot.state,'draft'); report.downloads.push(file.suggestedFilename());
 await page.locator('#followRoute').selectOption(bpi.routeId);
 await page.locator('#followUp').click(); await page.getByText('A new package revision is ready for review.').waitFor();
 await page.locator('#responseDraft').fill('Synthetic ownership declaration reviewed; no bank submission.');
 await page.locator('#exportRoute').selectOption(bpi.routeId); assert.equal(await page.locator('#approve').isDisabled(),false);
 download=page.waitForEvent('download'); await page.locator('#approve').click(); file=await download;
 payload=JSON.parse(await readFile(await file.path(),'utf8')); assert.equal(payload.packageSnapshot.state,'approved');
 assert.equal(payload.packageSnapshot.followUp.approvedResponse,'Synthetic ownership declaration reviewed; no bank submission.'); report.downloads.push(file.suggestedFilename());
 await mkdir('artifacts',{recursive:true}); await page.screenshot({path:'artifacts/live-research-desktop.png',fullPage:true});
 await page.reload(); await page.getByText('Demo session restored.').waitFor();await page.locator('#preparation').evaluate(el=>el.open=true); assert.match(await page.locator('#packages').innerText(),/approved/);
 assert.deepEqual(errors,[]); report.ok=true;
} catch(error) { report.ok=false; report.error=error.message; process.exitCode=1; }
finally { await mkdir('artifacts',{recursive:true}); await writeFile('artifacts/live-browser-report.json',JSON.stringify(report,null,2)); console.log(JSON.stringify(report)); await browser.close(); await new Promise(resolve=>server.close(resolve)); }
