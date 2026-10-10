import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNeeds,assessOptions,publicSelectionCatalog} from '../app/selection.mjs';
import {researchData} from '../app/research-data.mjs';
const session={profile:researchData.profile,requirementsByRoute:researchData.requirementsByRoute,inputRevision:0};
const needs=n=>validateNeeds({legalForm:'Lda',monthlySepaPayments:n,priorities:{team_cards:'preference'}},true);
const qonto=(n,s=session,c=publicSelectionCatalog)=>{const a=assessOptions(s,needs(n),c);return [...a.shortlist,...a.clarify,...a.excluded].find(r=>r.bank==='Qonto');};
test('tariff boundaries: annual commitment, included allowance and excess cents',()=>{
 for(const [index,limit,base,rate,annual] of [[0,30,900,20,10800],[1,100,1900,20,22800],[2,200,3900,10,46800]]){
  for(const n of [0,limit,limit+1]){const plan=qonto(n).tariffs[index];assert.equal(plan.knownMonthlySubtotalCents,base+Math.max(0,n-limit)*rate);assert.equal(plan.annualSubscriptionCents,annual);assert.equal(plan.complete,false);assert.equal(plan.billing,'annual');assert.ok(plan.source.url.startsWith('https://'));}
 }
});
test('unknown usage stays unknown and general payment count is never substituted',()=>{
 const row=qonto(null);assert.equal(row.tariffs[0].sepaOverageCents,null);assert.equal(row.tariffs[0].knownMonthlySubtotalCents,900);
 const a=assessOptions(session,validateNeeds({legalForm:'Lda',monthlyPayments:200,priorities:{online:'preference'}},true));assert.equal(a.clarify.find(r=>r.bank==='Qonto').tariffs[0].sepaOverageCents,null);
});
test('SEPA counts validate, legacy drafts default to unknown',()=>{
 assert.equal(validateNeeds({}).monthlySepaPayments,null);
 for(const n of [-1,0.5,'30',1000001])assert.throws(()=>needs(n));
 assert.equal(needs(0).monthlySepaPayments,0);
});
test('expired/unavailable/conflicting tariff evidence and out-of-scope profile do not yield prices',()=>{
 for(const patch of [{retrievedAt:'2020-01-01'},{unavailable:true},{conflict:true}]){
  const catalog=routes=>publicSelectionCatalog(routes).map(e=>({...e,tariffs:e.tariffs?.map(t=>({...t,source:{...t.source,...patch}}))}));assert.deepEqual(qonto(31,session,catalog).tariffs,[]);
 }
 assert.deepEqual(qonto(31,{...session,profile:{...session.profile,country:'ES'}}).tariffs,[]);
 const a=assessOptions(session,validateNeeds({...needs(31),legalForm:'SA'},true));assert.deepEqual(a.clarify.find(r=>r.bank==='Qonto').tariffs,[]);
});
test('explicit team card evidence improves explained preference; international transfers do not imply currency balances',()=>{
 const row=qonto(0);assert.equal(row.facts.find(f=>f.key==='team_cards').value,true);assert.equal(row.preferenceMatches,1);
 const a=assessOptions(session,validateNeeds({legalForm:'Lda',priorities:{multi_currency:'mandatory'}},true));assert.equal(a.clarify.find(r=>r.bank==='Qonto').facts[0].value,'unknown');
 assert.equal(a.clarify.find(r=>r.bank==='Banco BPI').tariffs[0].complete,false);
});
