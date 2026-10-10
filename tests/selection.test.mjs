import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppServer} from '../app/server.mjs';
const fact=value=>({value,source:{url:'https://example.test/selection',excerpt:'Fictional acceptance fixture',retrievedAt:'2026-10-06',kind:'synthetic'}});
export const selectionFixtureAdapter = routes => routes.slice(0,3).map((r,i)=>({routeId:r.routeId,capabilities:{online:fact(i===1?false:i===2?'unknown':true),multi_currency:fact(i===0?true:'unknown'),team_cards:fact(true)},eligibility:{status:'possible',rationale:'Fictional eligibility fixture'}}));
const needs={legalForm:'Lda',currencies:['EUR'],monthlyPayments:0,priorities:{online:'mandatory',multi_currency:'preference',team_cards:'irrelevant',branch:'irrelevant',local_payments:'irrelevant'}};
async function setup(run){const server=createAppServer({env:{DATA_FILE:''},selectionCatalog:selectionFixtureAdapter});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;const post=async(path,input)=>{const res=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});return {status:res.status,data:await res.json()};};try{const demo=await(await fetch(base+'/api/demo?mode=research')).json();await run({base,post,demo});}finally{await new Promise(r=>server.close(r));}}
test('SEL S04 mandatory no excludes, unknown needs clarification; confirmed preference is explained',()=>setup(async({post,demo})=>{
 const r=await post('/api/selection/assess',{sessionId:demo.sessionId,baseRevision:0,idempotencyKey:'selection-test-01',needs});assert.equal(r.status,200);
 assert.equal(r.data.decision.assessment.shortlist[0].routeId,'santander-pt-company-online');assert.equal(r.data.decision.assessment.shortlist[0].preferenceMatches,1);
 assert.equal(r.data.decision.assessment.excluded[0].routeId,'bpi-pt-company-documents');assert.equal(r.data.decision.assessment.clarify[0].routeId,'cgd-pt-company-branch');
 assert.ok(r.data.decision.assessment.shortlist[0].facts.some(f=>f.source.url));
}));
test('SEL S01 draft resume, S02 zero vs unknown, invalid quantities, S16 revision/replay',()=>setup(async({post,demo,base})=>{
 const payload={sessionId:demo.sessionId,baseRevision:0,idempotencyKey:'selection-draft-01',needs:{}};
 const saved=await post('/api/selection/save',payload);assert.equal(saved.status,200);assert.equal(saved.data.decision.revision,1);
 assert.deepEqual((await post('/api/selection/save',payload)).data,saved.data);
 const restored=await(await fetch(`${base}/api/sessions/${demo.sessionId}`)).json();assert.equal(restored.decision.revision,1);
 const invalid=await post('/api/selection/assess',{...payload,idempotencyKey:'selection-bad-01',baseRevision:1,needs:{...needs,monthlyPayments:-1}});assert.equal(invalid.status,400);
 const missing=await post('/api/selection/assess',{...payload,idempotencyKey:'selection-missing-01',baseRevision:1});assert.equal(missing.status,400);
 const good=await post('/api/selection/assess',{...payload,idempotencyKey:'selection-assess-01',baseRevision:1,needs});assert.equal(good.status,200);assert.equal(good.data.decision.needs.monthlyPayments,0);
 assert.equal((await post('/api/selection/save',{...payload,idempotencyKey:'selection-stale-01'})).status,409);
}));
test('SEL S17 chosen route persisted; foreign session cannot choose it; edited needs drops choice',()=>setup(async({post,demo,base})=>{
 const r=await post('/api/selection/assess',{sessionId:demo.sessionId,baseRevision:0,idempotencyKey:'selection-choose-01',needs});
 assert.equal(r.status,200);
 const choice=await post('/api/selection/choose',{sessionId:demo.sessionId,baseRevision:1,idempotencyKey:'selection-choose-02',routeId:'santander-pt-company-online'});assert.equal(choice.status,200);assert.equal(choice.data.decision.chosenRouteId,'santander-pt-company-online');
 assert.equal((await post('/api/selection/choose',{sessionId:'unknown-session',baseRevision:2,idempotencyKey:'selection-foreign-01',routeId:'santander-pt-company-online'})).status,404);
 const saved=await post('/api/selection/save',{sessionId:demo.sessionId,baseRevision:2,idempotencyKey:'selection-reset-01',needs:{...needs,monthlyPayments:10}});assert.equal(saved.status,200);assert.equal(saved.data.decision.chosenRouteId,null);assert.equal(saved.data.decision.assessment,null);assert.equal(saved.data.decision.history.length,2);
 const restored=await(await fetch(`${base}/api/sessions/${demo.sessionId}`)).json();assert.equal(restored.decision.needs.monthlyPayments,10);
}));

test('SEL S15 profile change invalidates recommendation and prevents stale choice',()=>setup(async({post,demo,base})=>{
 const initial=await post('/api/selection/assess',{sessionId:demo.sessionId,baseRevision:0,idempotencyKey:'selection-stale-a',needs});assert.equal(initial.status,200);
 const analyzed=await post('/api/analyze',{sessionId:demo.sessionId,baseInputRevision:0,idempotencyKey:'selection-profile-a',profile:{...demo.profile,name:'Changed synthetic company'},evidence:demo.evidence});assert.equal(analyzed.status,200);
 const restored=await(await fetch(`${base}/api/sessions/${demo.sessionId}`)).json();assert.equal(restored.decision.stale,true);
 assert.equal((await post('/api/selection/choose',{sessionId:demo.sessionId,baseRevision:1,idempotencyKey:'selection-stale-b',routeId:'santander-pt-company-online'})).status,409);
}));
test('SEL S16 malformed client scores cannot become authoritative; draft cannot be chosen',()=>setup(async({post,demo})=>{
 assert.equal((await post('/api/selection/choose',{sessionId:demo.sessionId,baseRevision:0,idempotencyKey:'selection-no-assess',routeId:'santander-pt-company-online'})).status,409);
 const r=await post('/api/selection/assess',{sessionId:demo.sessionId,baseRevision:0,idempotencyKey:'selection-client-scores',needs,shortlist:[{routeId:'bpi-pt-company-documents',score:999}]});assert.equal(r.status,200);assert.equal(r.data.decision.assessment.excluded[0].routeId,'bpi-pt-company-documents');
 assert.equal((await post('/api/selection/choose',{sessionId:demo.sessionId,baseRevision:1,idempotencyKey:'selection-excluded-choice',routeId:'bpi-pt-company-documents'})).status,400);
}));

test('SEL S07 stale capability and S03 unsupported form never yield confirmed shortlist',async()=>{
 const {assessOptions,validateNeeds}=await import('../app/selection.mjs');
 const {researchData}=await import('../app/research-data.mjs');
 const session={profile:researchData.profile,requirementsByRoute:researchData.requirementsByRoute,inputRevision:0};
 const staleCatalog=routes=>selectionFixtureAdapter(routes).map(r=>({...r,capabilities:{...r.capabilities,online:{...r.capabilities.online,source:{...r.capabilities.online.source,retrievedAt:'2020-01-01'}}}}));
 const stale=assessOptions(session,validateNeeds(needs,true),staleCatalog);assert.equal(stale.shortlist.length,0);assert.equal(stale.clarify.length,3);
 const outside=assessOptions(session,validateNeeds({...needs,legalForm:'SA'},true),selectionFixtureAdapter);assert.equal(outside.shortlist.length,0);assert.equal(outside.excluded.length,0);
});
