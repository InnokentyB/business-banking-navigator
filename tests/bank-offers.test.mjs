import test from 'node:test';import assert from 'node:assert/strict';
import {assessOptions,validateNeeds,publicSelectionCatalog} from '../app/selection.mjs';import {researchData} from '../app/research-data.mjs';
const session={profile:researchData.profile,inputRevision:0,requirementsByRoute:researchData.requirementsByRoute};
const assessment=()=>assessOptions(session,validateNeeds({legalForm:'Lda',monthlySepaPayments:31,priorities:{branch:'preference'}},true));
const row=(a,id)=>[...a.clarify,...a.excluded,...a.shortlist].find(r=>r.routeId===id);
test('BPI standard pricing does not silently apply conditional discount or invent transaction costs',()=>{
 const r=row(assessment(),'bpi-pt-company-documents');assert.equal(r.tariffs.length,4);assert.equal(r.tariffs[0].knownMonthlySubtotalCents,799);assert.equal(r.tariffs[0].billing,'monthly');assert.equal(r.tariffs[0].sepaOverageCents,null);assert.match(r.tariffs[0].notes,/active BPI TPA/);assert.match(r.tariffs[0].tax,/stamp duty/);assert.equal(r.facts[0].value,true);
});
test('CGD published monthly fees retain included stamp duty and unknown operation costs',()=>{
 const r=row(assessment(),'cgd-pt-company-branch');assert.deepEqual(r.tariffs.map(t=>t.knownMonthlySubtotalCents),[832,1456,4160]);assert.match(r.tariffs[0].tax,/included/);assert.equal(r.tariffs[0].usageKnown,false);assert.equal(r.tariffs[0].complete,false);
});
test('Santander tariff display cannot override foreign participant online ineligibility',()=>{
 const a=assessment(),r=row(a,'santander-pt-company-online');assert.ok(a.excluded.includes(r));assert.deepEqual(r.tariffs.map(t=>t.knownMonthlySubtotalCents),[390,1190,1590]);assert.match(r.tariffs[0].tax,/4%/);assert.equal(r.tariffs[1].sepaOverageCents,null);
});
test('monthly offers with stale source never produce known subtotal',()=>{
 const catalog=routes=>publicSelectionCatalog(routes).map(e=>({...e,tariffs:e.tariffs.map(t=>({...t,source:{...t.source,stale:true}}))}));const a=assessOptions(session,validateNeeds({legalForm:'Lda',priorities:{branch:'preference'}},true),catalog);assert.ok([...a.clarify,...a.excluded,...a.shortlist].every(r=>r.tariffs.length===0));
});

test('novobanco current published fee replaces historical amount and does not apply conditional rebates',()=>{
 const r=row(assessment(),'novobanco-pt-lda-documents');assert.equal(r.tariffs[0].knownMonthlySubtotalCents,1395);assert.match(r.tariffs[0].tax,/4%/);assert.match(r.tariffs[0].notes,/not applied/);assert.equal(r.tariffs[0].sepaOverageCents,null);assert.match(r.tariffs[0].source.url,/novobanco.pt/);
});
