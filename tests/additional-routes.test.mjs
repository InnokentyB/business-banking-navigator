import test from 'node:test';
import assert from 'node:assert/strict';
import { researchData } from '../app/research-data.mjs';
import { additionalResearchRoutes } from '../app/additional-research-routes.mjs';
import { buildPackages, approvePackage } from '../app/domain.mjs';
import { createAppServer } from '../app/server.mjs';

test('additional routes retain channel boundaries, dated official provenance and open scope',()=>{
 assert.equal(researchData.requirementsByRoute.length,9);
 assert.deepEqual(additionalResearchRoutes.map(r=>r.channel),['branch','unknown','online']);
 for(const route of additionalResearchRoutes) {
  assert.ok(route.requirements.length>0);
  assert.equal(route.coverage,'partial');
  assert.ok(route.scopeNote);
  for(const requirement of route.requirements) assert.ok(route.sources.some(s=>s.id===requirement.sourceId));
  for(const source of route.sources) {
   assert.equal(source.retrievedAt,'2026-10-04');
   const host=new URL(source.url).hostname;
   assert.ok(route.officialDomains.some(d=>host===d || host.endsWith(`.${d}`)));
  }
  const all=route.requirements.flatMap((r,i)=>(r.evidenceGroups||[{evidenceKinds:r.evidenceKinds||[r.evidenceType],subject:r.subject}]).flatMap((g,j)=>g.evidenceKinds.map((type,k)=>({id:`${i}-${j}-${k}`,type,subject:g.subject,synthetic:true}))));
  const pkg=buildPackages({profile:researchData.profile,evidence:all,requirementsByRoute:[route]}).packages[0];
  assert.equal(pkg.status,'needs_review');
  assert.equal(pkg.routeEligibility.status,'check_directly');
  assert.equal(pkg.items.at(-1).status,'uncertain');
  assert.throws(()=>approvePackage(pkg,{actor:'test'}));
 }
});

test('novobanco ownership proof requires RCBE AND one alternative, not all alternatives',()=>{
 const route=structuredClone(additionalResearchRoutes[1]);
 const requirement=route.requirements.find(r=>r.id==='NOVO-STRUCTURE');
 delete requirement.conditional; // A reviewer has confirmed document details for this synthetic case.
 route.requirements=[requirement];
 const analyze=evidence=>buildPackages({profile:researchData.profile,evidence,requirementsByRoute:[route]}).packages[0].items[0];
 const crc={id:'crc',type:'commercial_registration',subject:'company'};
 const rcbe={id:'rcbe',type:'rcbe_certificate',subject:'company'};
 assert.equal(analyze([crc]).status,'missing');
 assert.equal(analyze([rcbe]).status,'missing');
 assert.equal(analyze([crc,rcbe]).status,'ready');
 assert.equal(analyze([{...crc,subject:'Sofia Costa'},rcbe]).status,'missing');
});

test('Qonto conflicting shareholder threshold cannot be closed with a generic document',()=>{
 const route=additionalResearchRoutes[2];
 const pkg=buildPackages({profile:researchData.profile,evidence:[{id:'shareholders',type:'shareholder_declaration',subject:'company'}],requirementsByRoute:[route]}).packages[0];
 assert.equal(pkg.items.find(r=>r.requirementId==='QONTO-SHAREHOLDERS').status,'uncertain');
});

test('research API exposes nine isolated routes and refuses approval of partial new packages',async()=>{
 const server=createAppServer({env:{DATA_FILE:''}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try {
  const demo=await (await fetch(`${base}/api/demo?mode=research`)).json();
  assert.equal(demo.requirementsByRoute.length,9);
  const response=await fetch(`${base}/api/analyze`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:demo.sessionId,baseInputRevision:demo.inputRevision,idempotencyKey:'five-route-analysis',profile:demo.profile,evidence:demo.evidence})});
  assert.equal(response.status,200);
  const analysis=await response.json(); assert.equal(analysis.packages.length,9);
  for(const route of additionalResearchRoutes) {
   const pkg=analysis.packages.find(p=>p.routeId===route.routeId);assert.equal(pkg.status,'needs_review');
   const result=await fetch(`${base}/api/approve`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:demo.sessionId,packageId:pkg.id,baseRevision:pkg.revision,idempotencyKey:`approve-${route.routeId}`})});
   assert.equal(result.status,409);
  }
 } finally {await new Promise(resolve=>server.close(resolve));}
});
