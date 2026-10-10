import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createAppServer } from '../app/server.mjs';
import { DemoStore } from '../app/store.mjs';

async function withServer(options, run) {
  const server = createAppServer(options).listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise(resolve => server.close(resolve)); }
}
async function post(base, path, data, headers = {}) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) });
  return { status: response.status, data: await response.json() };
}
const demoAt = async base => (await fetch(base + '/api/demo')).json();
const analyze = async (base, demo, overrides = {}) => { const result = await post(base, '/api/analyze', { sessionId: demo.sessionId, baseInputRevision: demo.inputRevision, idempotencyKey: `analyze-${crypto.randomUUID()}`, profile: demo.profile, evidence: demo.evidence, ...overrides }); if(result.status === 200) demo.inputRevision = result.data.inputRevision; return result; };
const command = (demo, pkg, key, overrides = {}) => ({ sessionId: demo.sessionId, packageId: pkg.id, baseRevision: pkg.revision, idempotencyKey: key, ...overrides });
const approve = (base, demo, pkg, key = 'approve-0001') => post(base, '/api/approve', command(demo, pkg, key));

// TC-01/02/03/13: reusable profile, distinct requirements, authoritative export.
test('synthetic flow creates route-specific server snapshots and authoritative approval/export', async () => {
  await withServer({ env: {} }, async base => {
    const demo = await demoAt(base), result = await analyze(base, demo);
    assert.equal(result.status, 200); assert.equal(result.data.mode, 'fixture');
    const [a,b] = result.data.packages;
    assert.equal(a.items.find(i=>i.requirementId==='A3').status,'missing');
    assert.equal(a.items.find(i=>i.requirementId==='A4').status,'uncertain');
    assert.equal((await approve(base,demo,a)).status,409);
    const approved = await approve(base,demo,b); assert.equal(approved.status,200);
    assert.equal(approved.data.packageSnapshot.state,'approved');
    assert.equal(approved.data.packageSnapshot.approval.reviewedRevision,1);
    const exported = await (await fetch(`${base}/api/packages/${b.id}/export?sessionId=${demo.sessionId}`)).json();
    assert.equal(exported.exportKind,'approved-package'); assert.equal(exported.packageSnapshot.revision,2);
    assert.equal(exported.packageSnapshot.sources[0].id,'SB');
  });
});
test('client snapshot, client requirements, and missing synthetic marker are rejected', async () => {
  await withServer({env:{}},async base=>{
    const demo=await demoAt(base);
    assert.equal((await post(base,'/api/analyze',{...demo,baseInputRevision:demo.inputRevision,idempotencyKey:'client-rules-01'})).status,400);
    assert.equal((await analyze(base,demo,{profile:{...demo.profile,synthetic:false}})).status,400);
    const pkg=(await analyze(base,demo)).data.packages[1];
    assert.equal((await post(base,'/api/approve',{...command(demo,pkg,'tamper-0001'),packageSnapshot:{...pkg,status:'ready'}})).status,400);
  });
});
// TC-16/49/57: retry key, race, stale client.
test('approval retry is idempotent, a reused key with different input conflicts',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base),pkg=(await analyze(base,demo)).data.packages[1];
  const first=await approve(base,demo,pkg),repeat=await approve(base,demo,pkg);
  assert.deepEqual(repeat.data,first.data);
  assert.equal((await post(base,'/api/approve',command(demo,pkg,'approve-0001',{response:'changed'}))).status,409);
  assert.equal((await approve(base,demo,pkg,'different-key')).data.code,'REVISION_CONFLICT');
 });
});
test('two concurrent approvals produce exactly one success for different commands',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base),pkg=(await analyze(base,demo)).data.packages[1];
  const results=await Promise.all([approve(base,demo,pkg,'race-key-1'),approve(base,demo,pkg,'race-key-2')]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 });
});
// TC-11/13: follow-up creates a scoped revision, never transfers approval.
test('follow-up invalidates approval, requires evidence, and duplicate key preserves revision',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base), initial=(await analyze(base,demo)).data.packages[1];
  const approved=(await approve(base,demo,initial)).data.packageSnapshot;
  const input=command(demo,approved,'followup-01',{followUp:demo.followUp,newEvidence:[]});
  const missing=await post(base,'/api/follow-up',input); assert.equal(missing.status,200);
  const pkg=missing.data.packageSnapshot; assert.equal(pkg.state,'draft');assert.equal(pkg.approval,null);assert.equal(pkg.status,'needs_review');
  assert.deepEqual((await post(base,'/api/follow-up',input)).data,missing.data);
  const revised=await post(base,'/api/follow-up',command(demo,pkg,'followup-02',{followUp:demo.followUp,newEvidence:[demo.followUpEvidence]}));
  assert.equal(revised.status,200);assert.equal(revised.data.packageSnapshot.status,'ready');
  assert.equal((await approve(base,demo,revised.data.packageSnapshot,'approve-new')).status,200);
  assert.equal((await post(base,'/api/follow-up',command(demo,initial,'old-followup',{followUp:demo.followUp,newEvidence:[]}))).status,409);
 });
});
test('unknown follow-up cannot be satisfied by sample ownership evidence or foreign route',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base), pkg=(await analyze(base,demo)).data.packages[1];
  const result=await post(base,'/api/follow-up',command(demo,pkg,'unknown-01',{followUp:{id:'F2',routeId:'B',text:'Provide turnover'},newEvidence:[demo.followUpEvidence]}));
  assert.equal(result.status,200);assert.equal(result.data.packageSnapshot.items.at(-1).status,'missing');assert.match(result.data.proposedResponse,/person/);
  assert.equal((await post(base,'/api/follow-up',command(demo,result.data.packageSnapshot,'wrong-route',{followUp:{...demo.followUp,routeId:'A'},newEvidence:[]}))).status,400);
 });
});
// TC-14: changes to a shared input invalidate packages that were not rebuilt.
test('reanalyzing one route after shared evidence change invalidates the other export',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base), packages=(await analyze(base,demo)).data.packages;
  const approved=(await approve(base,demo,packages[1])).data.packageSnapshot;
  const result=await analyze(base,demo,{routeIds:['A'],evidence:[...demo.evidence,demo.followUpEvidence]});assert.equal(result.status,200);
  const stale=await fetch(`${base}/api/packages/${approved.id}/export?sessionId=${demo.sessionId}`);assert.equal(stale.status,409);
 });
});
test('separate sessions cannot read or approve each other packages',async()=>{
 await withServer({env:{}},async base=>{
  const a=await demoAt(base),b=await demoAt(base),pkg=(await analyze(base,a)).data.packages[1];
  assert.equal((await approve(base,b,pkg)).status,404);
  assert.equal((await fetch(`${base}/api/packages/${pkg.id}?sessionId=${b.sessionId}`)).status,404);
 });
});
// TC-15/38: actual invocation contract and safe failure with previous result preserved.
test('model config is forwarded and service error leaves the approved package untouched',async()=>{
 let fail=false,calls=0;
 await withServer({env:{NEBIUS_API_KEY:'hidden-key',NEBIUS_MODEL:'configured-model'},infer:async args=>{
  calls++;assert.equal(args.model,'configured-model');if(fail)throw new Error('hidden-key');
  return {items:args.requirements.map(r=>({requirementId:r.id,sourceId:r.sourceId,evidenceIds:[],status:'missing',rationale:'review'}))};
 }},async base=>{
  const demo=await demoAt(base),result=await analyze(base,demo);assert.equal(result.data.mode,'live-model');assert.equal(calls,1);
  fail=true;const failed=await analyze(base,demo);assert.equal(failed.status,502);assert.doesNotMatch(JSON.stringify(failed.data),/hidden-key/);
  const before=result.data.packages[1],saved=await (await fetch(`${base}/api/packages/${before.id}?sessionId=${demo.sessionId}`)).json();assert.equal(saved.packageSnapshot.revision,before.revision);
 });
});
test('an in-flight model cannot overwrite a newer approved revision',async()=>{
 let release;let wait=false;const gate=new Promise(resolve=>release=resolve);
 await withServer({env:{NEBIUS_API_KEY:'key'},infer:async args=>{
  if(wait)await gate;return{items:args.requirements.map(r=>({requirementId:r.id,sourceId:r.sourceId,evidenceIds:[],status:'missing',rationale:'review'}))};
 }},async base=>{
  const demo=await demoAt(base); const first=await analyze(base,demo);const b=first.data.packages[1];
  // With a model selecting no evidence, B is unresolved; source review creates a newer revision instead.
  wait=true;const pending=analyze(base,demo);
  await new Promise(resolve=>setImmediate(resolve));
  const refreshed=await post(base,'/api/sources/refresh',{sessionId:demo.sessionId,routeId:'B'});
  const c=refreshed.data.candidates[0];
  const review=await post(base,'/api/routes/B/source-review',{sessionId:demo.sessionId,baseVersion:1,candidateId:c.id,decision:'approve',requirements:demo.requirementsByRoute[1].requirements});
  assert.equal(review.status,200);release();const conflict=await pending;assert.equal(conflict.status,409);
  assert.equal(review.data.packages.find(p=>p.id===b.id).state,'stale');
 });
});
// TC-27/30/31/35/40/41: refresh -> review -> requirements version -> stale package.
test('saved fallback preserves dates and only explicit source review changes a route',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base), packages=(await analyze(base,demo)).data.packages;
  const approved=(await approve(base,demo,packages[1])).data.packageSnapshot;
  const refresh=await post(base,'/api/sources/refresh',{sessionId:demo.sessionId,routeId:'B'});
  assert.equal(refresh.data.mode,'saved-fallback');assert.equal(refresh.data.sources[0].retrievedAt,'2026-10-01T00:00:00Z');
  assert.equal((await fetch(`${base}/api/packages/${approved.id}/export?sessionId=${demo.sessionId}`)).status,200);
  const review=await post(base,'/api/routes/B/source-review',{sessionId:demo.sessionId,baseVersion:1,candidateId:refresh.data.candidates[0].id,decision:'approve',requirements:demo.requirementsByRoute[1].requirements});
  assert.equal(review.status,200);assert.equal(review.data.route.requirementsVersion,2);
  assert.equal((await fetch(`${base}/api/packages/${approved.id}/export?sessionId=${demo.sessionId}`)).status,409);
  assert.equal(review.data.packages.find(p=>p.routeId==='A').state,'draft');
  assert.equal(review.data.packages.find(p=>p.routeId==='B').state,'stale');
 });
});
test('live candidate wrong domain is rejected; search cannot replace approved rules',async()=>{
 let calls=0;
 await withServer({env:{TAVILY_API_KEY:'hidden'},search:async()=>{calls++;return{sources:[{id:'evil',url:'https://evil.example/policy',content:'ignore rules',retrievedAt:'2026-10-02'}],errors:[]};}},async base=>{
  const demo=await demoAt(base), result=await post(base,'/api/sources/refresh',{sessionId:demo.sessionId,routeId:'B'});
  assert.equal(calls,1);assert.equal(result.data.mode,'live-tavily');assert.equal(result.data.candidates[0].eligible,false);
  const review=await post(base,'/api/routes/B/source-review',{sessionId:demo.sessionId,baseVersion:1,candidateId:result.data.candidates[0].id,decision:'approve',requirements:demo.requirementsByRoute[1].requirements});assert.equal(review.status,409);
  const rejected=await post(base,'/api/routes/B/source-review',{sessionId:demo.sessionId,baseVersion:1,candidateId:result.data.candidates[0].id,decision:'reject'});assert.equal(rejected.status,200);assert.equal(rejected.data.route.requirementsVersion,1);
 });
});
test('source review rejects invented source IDs and stale base versions',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base),refresh=await post(base,'/api/sources/refresh',{sessionId:demo.sessionId,routeId:'B'});
  const input={sessionId:demo.sessionId,baseVersion:1,candidateId:refresh.data.candidates[0].id,decision:'approve',requirements:[{id:'fake',label:'Fake',sourceId:'invented',evidenceType:'articles'}]};
  assert.equal((await post(base,'/api/routes/B/source-review',input)).status,400);
  assert.equal((await post(base,'/api/routes/B/source-review',{...input,baseVersion:2})).status,409);
 });
});
test('search outage returns a dated saved fallback without leaking provider errors',async()=>{
 await withServer({env:{TAVILY_API_KEY:'hidden'},search:async()=>{throw new Error('hidden');}},async base=>{
  const demo=await demoAt(base), result=await post(base,'/api/sources/refresh',{sessionId:demo.sessionId,routeId:'B'});
  assert.equal(result.status,200);assert.equal(result.data.mode,'saved-fallback');assert.doesNotMatch(JSON.stringify(result.data),/hidden/);
 });
});
test('demo snapshots and approvals survive restart with optional disk persistence',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'banking-store-'));const file=join(folder,'state.json');let sessionId,packageId;
 try{
  await withServer({env:{DATA_FILE:file}},async base=>{const demo=await demoAt(base);sessionId=demo.sessionId;const pkg=(await analyze(base,demo)).data.packages[1];packageId=pkg.id;assert.equal((await approve(base,demo,pkg)).status,200);});
  await withServer({env:{DATA_FILE:file}},async base=>{const result=await fetch(`${base}/api/packages/${packageId}/export?sessionId=${sessionId}`);assert.equal(result.status,200);assert.equal((await result.json()).packageSnapshot.state,'approved');});
 }finally{await rm(folder,{recursive:true,force:true});}
});
test('TTL, capacity, malformed input, missing profile, and cross-origin POST fail safely',async()=>{
 let now=0;const store=new DemoStore({now:()=>now,ttlMs:100,maxSessions:1});
 await withServer({env:{},store},async base=>{
  const demo=await demoAt(base);assert.equal((await fetch(base+'/api/demo')).status,429);
  assert.equal((await analyze(base,demo,{profile:{...demo.profile,registrationNumber:''}})).status,400);
  assert.equal((await post(base,'/api/analyze',{sessionId:demo.sessionId},{origin:'https://other.example'})).status,403);
  const malformed=await fetch(base+'/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:'{'});assert.equal(malformed.status,400);
  const nonjson=await fetch(base+'/api/analyze',{method:'POST',body:'{}'});assert.equal(nonjson.status,415);
  now=101;assert.equal((await analyze(base,demo)).status,404);
 });
});
test('rate limiting, health readiness, and static security headers are observable',async()=>{
 await withServer({env:{RATE_LIMIT:1}},async base=>{
  const health=await (await fetch(base+'/health')).json();assert.equal(health.status,'ok');
  const ready=await (await fetch(base+'/ready')).json();assert.equal(ready.services.nebiusConfigured,false);
  const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.equal((await fetch(base+'/api/demo')).status,429);
 });
});

test('analysis retry and overlapping same-key calls create one package revision and one model call',async()=>{
 let calls=0;
 await withServer({env:{NEBIUS_API_KEY:'test'},infer:async args=>{calls++;await new Promise(r=>setTimeout(r,15));return{items:args.requirements.map(r=>({requirementId:r.id,sourceId:r.sourceId,evidenceIds:[],status:'missing',rationale:'review'}))};}},async base=>{
  const demo=await demoAt(base),input={sessionId:demo.sessionId,baseInputRevision:0,idempotencyKey:'same-analysis-01'};
  const [a,b]=await Promise.all([post(base,'/api/analyze',input),post(base,'/api/analyze',input)]);assert.equal(a.status,200);assert.deepEqual(a.data,b.data);assert.equal(calls,1);
  assert.deepEqual((await post(base,'/api/analyze',input)).data,a.data);
  assert.equal((await post(base,'/api/analyze',{...input,routeIds:['B']})).status,409);
 });
});
test('session resume returns saved packages and two windows must respect input revision',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base),first=await analyze(base,demo);
  const resume=await (await fetch(`${base}/api/sessions/${demo.sessionId}`)).json();assert.equal(resume.packages.length,2);assert.equal(resume.inputRevision,1);
  const stale=await analyze(base,demo,{baseInputRevision:0});assert.equal(stale.status,409);assert.equal(stale.data.code,'INPUT_REVISION_CONFLICT');
  assert.equal((await post(base,'/api/approve',{sessionId:demo.sessionId,packageId:first.data.packages[1].id,idempotencyKey:'no-revision-1'})).status,400);
  const deleted=await fetch(`${base}/api/sessions/${demo.sessionId}`,{method:'DELETE'});assert.equal(deleted.status,200);
  assert.equal((await fetch(`${base}/api/sessions/${demo.sessionId}`)).status,404);
 });
});
test('failed approval persistence rolls back the visible state and export remains draft',async()=>{
 const store=new DemoStore();const save=store.save.bind(store);let broken=false;store.save=()=>{if(broken)throw new Error('disk unavailable');save();};
 await withServer({env:{},store},async base=>{
  const demo=await demoAt(base),pkg=(await analyze(base,demo)).data.packages[1];broken=true;
  assert.equal((await approve(base,demo,pkg)).status,502);broken=false;
  const exported=await (await fetch(`${base}/api/packages/${pkg.id}/export?sessionId=${demo.sessionId}`)).json();assert.equal(exported.exportKind,'draft-checklist');assert.equal(exported.packageSnapshot.revision,1);assert.equal(exported.packageSnapshot.approval,null);
 });
});
test('official live candidate goes through review and model gets its source snapshot',async()=>{
 let receivedSource;
 await withServer({env:{TAVILY_API_KEY:'t',NEBIUS_API_KEY:'n'},search:async()=>({sources:[{id:'current-SB',url:'https://example.test/bank-b/assisted',content:'New documented route requires an ownership chart.',excerpt:'New requirement',retrievedAt:'2026-10-02',provenance:{extract:true}}],errors:[]}),infer:async args=>{receivedSource=args.requirements[0].source;return{items:args.requirements.map(r=>({requirementId:r.id,sourceId:r.sourceId,evidenceIds:[],status:'missing',rationale:'review'}))};}},async base=>{
  const demo=await demoAt(base), refreshed=await post(base,'/api/sources/refresh',{sessionId:demo.sessionId,routeId:'B'}),c=refreshed.data.candidates[0];assert.equal(c.changed,true);assert.equal(c.eligible,true);
  const reviewed=await post(base,'/api/routes/B/source-review',{sessionId:demo.sessionId,baseVersion:1,candidateId:c.id,decision:'approve',requirements:[{id:'B-NEW',sourceId:c.source.id,label:'Ownership chart',evidenceType:'ownership_chart',subject:'company'}]});assert.equal(reviewed.status,200);
  const result=await analyze(base,demo,{routeIds:['B']});assert.equal(result.status,200);assert.equal(result.data.packages[0].requirementsVersion,2);assert.equal(receivedSource.id,c.source.id);assert.match(receivedSource.content,/ownership/);
 });
});
test('research API exposes partial route-scoped sources with synthetic inputs',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await (await fetch(base+'/api/demo?mode=research')).json();assert.equal(demo.coverage,'partial');assert.equal(demo.profile.synthetic,true);
  const result=await analyze(base,demo);assert.equal(result.status,200);assert.equal(result.data.packages[0].routeEligibility.status,'not_supported_by_published_route');assert.equal(result.data.packages[1].routeEligibility.status,'check_directly');
 });
});

test('compound human-reviewed follow-up keeps both items and reanalysis cannot erase the request',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base), pkg=(await analyze(base,demo)).data.packages[1];
  const followUp={id:'compound-1',routeId:'B',text:'Provide ownership and company address',humanReviewed:true,requestedItems:[{id:'owners',label:'Ownership chart',evidenceType:'ownership_chart',subject:'company'},{id:'address',label:'Address evidence',evidenceType:'address',subject:'company'}]};
  const result=await post(base,'/api/follow-up',command(demo,pkg,'compound-command-1',{followUp,newEvidence:[demo.followUpEvidence]}));assert.equal(result.status,200);
  const items=result.data.packageSnapshot.items.filter(i=>i.origin==='follow_up');assert.equal(items.length,2);assert.deepEqual(items.map(i=>i.status),['ready','missing']);
  const resumed=await (await fetch(`${base}/api/sessions/${demo.sessionId}`)).json();assert.ok(resumed.evidence.some(e=>e.id===demo.followUpEvidence.id));
  demo.evidence=resumed.evidence;const rebuilt=await analyze(base,demo);assert.equal(rebuilt.status,200);
  const b=rebuilt.data.packages.find(p=>p.routeId==='B');assert.equal(b.items.filter(i=>i.origin==='follow_up').length,2);assert.equal(b.status,'needs_review');
  assert.equal((await approve(base,demo,b,'compound-approve')).status,409);
 });
});

test('printable export is current, source-attributed and escapes untrusted company/response text',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base);demo.profile.name='<script>alert(1)</script>';demo.evidence[0].fields.name=demo.profile.name;demo.evidence[1].fields.name=demo.profile.name;
  const pkg=(await analyze(base,demo)).data.packages[1];const print=await fetch(`${base}/api/packages/${pkg.id}/print?sessionId=${demo.sessionId}`);assert.equal(print.status,200);
  const html=await print.text();assert.match(html,/DRAFT CHECKLIST/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/example.test\/bank-b/);
  const approved=(await approve(base,demo,pkg)).data.packageSnapshot;
  const history=await (await fetch(`${base}/api/packages/${pkg.id}/history?sessionId=${demo.sessionId}`)).json();assert.deepEqual(history.snapshots.map(p=>p.state),['draft','approved']);
  await analyze(base,demo,{routeIds:['A'],evidence:[...demo.evidence,demo.followUpEvidence]});assert.equal((await fetch(`${base}/api/packages/${approved.id}/print?sessionId=${demo.sessionId}`)).status,409);
 });
});
test('source review supports AND evidence groups without allowing cross-route requirement IDs',async()=>{
 await withServer({env:{}},async base=>{
  const demo=await demoAt(base),refresh=await post(base,'/api/sources/refresh',{sessionId:demo.sessionId,routeId:'B'}),candidate=refresh.data.candidates[0];
  const input={sessionId:demo.sessionId,baseVersion:1,candidateId:candidate.id,decision:'approve',requirements:[{id:'B-GROUP',sourceId:candidate.source.id,label:'Registry and articles together',evidenceGroups:[{id:'registry',evidenceKinds:['registry_extract'],subject:'company'},{id:'articles',evidenceKinds:['articles'],subject:'company'}]}]};
  assert.equal((await post(base,'/api/routes/B/source-review',{...input,requirements:[{...input.requirements[0],id:'A1'}]})).status,400);
  assert.equal((await post(base,'/api/routes/B/source-review',input)).status,200);
  const result=await analyze(base,demo,{routeIds:['B']});assert.equal(result.status,200);assert.equal(result.data.packages[0].items[0].status,'ready');
 });
});
