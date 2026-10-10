import test from 'node:test';import assert from 'node:assert/strict';import {researchData} from '../app/research-data.mjs';import {assessOptions,validateNeeds} from '../app/selection.mjs';import {buildPackages,approvePackage} from '../app/domain.mjs';
test('Revolut multi-currency and team cards have PT product evidence but acceptance stays open',()=>{
 const session={profile:researchData.profile,inputRevision:0,requirementsByRoute:researchData.requirementsByRoute};const a=assessOptions(session,validateNeeds({legalForm:'Lda',priorities:{multi_currency:'mandatory',team_cards:'preference'}},true));const r=a.clarify.find(r=>r.bank==='Revolut Business');assert.ok(r);assert.equal(r.facts[0].value,true);assert.equal(r.preferenceMatches,1);assert.equal(r.eligibility.status,'check_directly');assert.deepEqual(r.tariffs.map(t=>t.knownMonthlySubtotalCents),[1000,3500,12500]);assert.match(r.tariffs[0].tax,/confirm/);
});
test('Revolut partial onboarding cannot become approvable even when synthetic evidence types match',()=>{
 const route=researchData.requirementsByRoute.find(r=>r.bank==='Revolut Business');assert.ok(route);const evidence=route.requirements.map((r,i)=>({id:`E-${i}`,type:r.evidenceType,subject:r.subject,synthetic:true}));const pkg=buildPackages({profile:researchData.profile,evidence,requirementsByRoute:[route]}).packages[0];assert.equal(pkg.status,'needs_review');assert.equal(pkg.items.at(-1).status,'uncertain');assert.throws(()=>approvePackage(pkg,{actor:'test'}));assert.ok(route.sources.every(s=>new URL(s.url).hostname.endsWith('revolut.com')));
});

test('Confirmed essential need appears before unknown support even when acceptance remains open',()=>{
 const session={profile:researchData.profile,inputRevision:0,requirementsByRoute:researchData.requirementsByRoute};const a=assessOptions(session,validateNeeds({legalForm:'Lda',priorities:{multi_currency:'mandatory',team_cards:'preference'}},true));assert.equal(a.clarify[0].bank,'Revolut Business');assert.equal(a.clarify[0].mandatoryMatches,1);assert.equal(a.clarify[0].tied,false);assert.equal(a.clarify.find(r=>r.bank==='Qonto').mandatoryMatches,0);
});
