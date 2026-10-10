const $ = id => document.getElementById(id);
const state = { demo: null, sessionId: null, inputRevision: 0, routes: [], packages: [], candidates: [], selectedCandidate: null, mode: null, sourceMode: null, busy: false, profileDirty: false, dirtyRoutes: new Set(), evidenceRevision: 0, pendingAnalyze: null };
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readable = v => String(v ?? '').replace(/_/g, ' ');
const prettyDate = v => v ? String(v).slice(0, 10) : 'date unavailable';
const freshKey = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
const pendingCommands = new Map(), requestIds = new Map();
async function command(path,input) {
  const signature=JSON.stringify(input), prior=pendingCommands.get(path);
  const operation=prior?.signature === signature ? prior : {signature,payload:{...input,idempotencyKey:freshKey()}};
  pendingCommands.set(path,operation);
  try { const result=await request(path,operation.payload); pendingCommands.delete(path); return result; }
  catch(error) { if(error.status && error.status < 500 && error.status !== 429) pendingCommands.delete(path); throw error; }
}
state.selectedRoutes = new Set();
const selectionKey = () => `BBN_ROUTES_${state.sessionId}`;
const selectedRouteIds = () => state.routes.map(routeId).filter(id => state.selectedRoutes.has(id));
const sessionStorageKey = 'BBN_SESSION_ID';
const replyKey = packageId => `BBN_REPLY_${state.sessionId}_${packageId}`;
function savedReply(packageId) { try { const value=JSON.parse(localStorage.getItem(replyKey(packageId)) || 'null'), pkg=state.packages.find(item=>item.id === packageId); return value?.revision === pkg?.revision ? value.text : null; } catch { return null; } }
function storeReply(packageId, text) { try { const pkg=state.packages.find(item=>item.id === packageId); localStorage.setItem(replyKey(packageId), JSON.stringify({revision:pkg?.revision,text})); } catch {} }
function currentFollowPackage() { return packageFor($('followRoute').value); }
function restoreReply() { const pkg=currentFollowPackage(), value=pkg?.followUp ? savedReply(pkg.id) : null; $('followResult').hidden=!pkg?.followUp; if (pkg?.followUp) $('responseDraft').value=value ?? pkg.followUp.approvedResponse ?? pkg.followUp.proposedResponse ?? ''; }
let manualCounter=0;
function addManualItem() {
  if ($('manualItems').children.length >= 5) return notice('A request can contain at most five manually classified items.',true);
  const row=document.createElement('div'); row.className='manual-item'; row.dataset.id=`manual-item-${++manualCounter}`;
  const types=[...$('newEvidenceType').options].map(option=>`<option value="${escapeHtml(option.value)}">${escapeHtml(option.text)}</option>`).join('');
  row.innerHTML=`<label>Requested item<input class="manual-label" placeholder="e.g. Updated shareholder register"></label><label>Evidence type<select class="manual-evidence-type">${types}</select></label><label>Whose evidence?<select class="manual-subject"><option value="company">Company</option><option value="representative">Representative</option></select></label><button class="secondary remove-manual" type="button" aria-label="Remove requested item">Remove</button>`;
  row.querySelector('.remove-manual').addEventListener('click',()=>{row.remove(); if (!$('manualItems').children.length) addManualItem();});
  $('manualItems').append(row);
}
function notice(message, error = false) { const n = $('notice'); n.textContent = message; n.hidden = !message; n.className = error ? 'error' : ''; n.setAttribute('role',error ? 'alert' : 'status'); n.setAttribute('aria-live',error ? 'assertive' : 'polite'); }
async function request(path, body) {
  const response = await fetch(path, body === undefined ? {} : { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
  let data; try { data = await response.json(); } catch { throw new Error(`Unreadable service response (${response.status})`); }
  if (!response.ok) { const err = new Error(data.error || data.message || `Request failed (${response.status})`); err.status = response.status; err.code = data.code; throw err; }
  return data;
}
function busy(on) {
  state.busy = on;
  for (const id of ['reload','resume','deleteSession','dataMode','addEvidence','analyze','refreshSources','reloadSources','rejectSource','approveSource','followUp','addManualItem','addRequirement','saveNeeds','assessNeeds']) $(id).disabled = on;
  for (const input of document.querySelectorAll('.choose-route, #needsForm input, #needsForm select, .choose-option, #printDecision, #downloadDecision')) input.disabled=on;
  for (const element of document.querySelectorAll('.profile-grid input, .profile-grid select, #followText, #manualReview, #followRoute, #exportRoute, #sourceRoute, #responseDraft, #reviewRequirements, .manual-item input, .manual-item select, .remove-evidence, .requirement-row input, .requirement-row select, .candidate-select')) element.disabled = on;
  for (const id of ['routes','packages','liveSources']) $(id).setAttribute('aria-busy',String(on));
  $('analyze').textContent = on ? 'Working…' : 'Analyze routes';
  updateButtons();
}
const routeId = r => r.routeId || r.id;
const routeById = id => state.routes.find(r => String(routeId(r)) === String(id));
const packageFor = id => state.packages.find(p => String(p.routeId) === String(id));
const sourcesFor = r => r?.sources || [];
const sourceFor = (r, id) => sourcesFor(r).find(s => String(s.id) === String(id));
const requirementsFor = r => r?.requirements || [];
function sourceMarkup(source) {
  if (!source) return '<span class="source">Source unavailable · review required</span>';
  const synthetic = source.kind === 'synthetic' || source.url?.includes('example.test');
  let url = escapeHtml(source.url || 'No URL');
  if (!synthetic && source.url) {
    try { const parsed = new URL(source.url); if (['https:','http:'].includes(parsed.protocol)) url = `<a href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(parsed.href)}</a>`; } catch {}
  }
  const date = source.retrievedAt || source.retrieved_at;
  return `<div class="source">${url} · ${synthetic ? 'fictional fixture' : source.kind === 'saved' ? 'saved source' : 'source'} · retrieved ${escapeHtml(prettyDate(date))}${synthetic ? ' · no bank policy verified' : ''}</div>`;
}
function readProfile() {
  const prior=state.demo.profile;
  const representativeName=$('representative').value.trim();
  const representative={...(prior.representatives?.[0] || prior.representative || {}),name:representativeName};
  const owners=$('owners').value.split(',').map(name=>name.trim()).filter(Boolean).map(name=>({...((prior.owners || []).find(owner=>owner.name === name) || {}),name}));
  return { ...prior, name:$('legalName').value.trim(), country:$('country').value.trim(), registrationNumber:$('registrationNumber').value.trim(), activity:$('businessActivity').value.trim(), facts:{...prior.facts,address:{value:$('businessAddress').value.trim(),verified:false,origin:'manual_synthetic'}}, representative, representatives:[representative], owners, synthetic:true };
}
function renderProfile() {
  const p = state.demo.profile || {};
  for (const [id,value] of Object.entries({legalName:p.name || p.legalName,country:p.country,registrationNumber:p.registrationNumber,businessActivity:p.activity || p.businessActivity,businessAddress:typeof p.facts?.address === 'object' ? p.facts.address.value : p.facts?.address,representative:p.representatives?.[0] || p.representative,owners:p.owners})) {
    $(id).value = Array.isArray(value) ? value.map(v=>v.name || v).join(', ') : typeof value === 'object' ? value?.name || '' : value || '';
  }
  renderEvidence();
}
function renderEvidence() {
  $('evidenceList').innerHTML = (state.demo?.evidence || []).map(e=>`<span class="chip" title="${escapeHtml(e.id)}">${escapeHtml(e.name || e.type || e.id)}<button type="button" class="remove-evidence" data-evidence="${escapeHtml(e.id)}" aria-label="Remove ${escapeHtml(e.name || e.type || e.id)}">×</button></span>`).join('') || '<span class="chip">No evidence yet</span>';
  $('evidenceList').querySelectorAll('.remove-evidence').forEach(button => button.addEventListener('click', () => { state.demo.evidence = state.demo.evidence.filter(item => item.id !== button.dataset.evidence); state.evidenceRevision++; renderEvidence(); markDirty(); }));
}
function updateSelectors() {
  const selected = Object.fromEntries(['sourceRoute','followRoute','exportRoute'].map(id=>[id,$(id).value]));
  const options = state.routes.map(r=>`<option value="${escapeHtml(routeId(r))}">${escapeHtml(r.bank || r.routeName || routeId(r))}</option>`).join('');
  for (const id of ['sourceRoute','followRoute','exportRoute']) {
    const routes=id==='sourceRoute' ? state.routes : state.routes.filter(r=>packageFor(routeId(r)));
    $(id).innerHTML=id==='sourceRoute' ? options : routes.map(r=>`<option value="${escapeHtml(routeId(r))}">${escapeHtml(r.bank || routeId(r))}</option>`).join('');
    if (routes.some(r=>String(routeId(r)) === selected[id])) $(id).value = selected[id];
  }
}
function renderRoutes() {
  $('routes').innerHTML = state.routes.map(r=>{
    const sources = sourcesFor(r), synthetic = sources.length && sources.every(s=>s.kind === 'synthetic');
    const sourceState = synthetic ? 'Fictional example' : r.sourceStatus || r.status || 'Review sources';
    return `<article class="panel route-card"><label class="route-choice"><input type="checkbox" class="choose-route" data-route="${escapeHtml(routeId(r))}" ${state.selectedRoutes.has(routeId(r)) ? 'checked' : ''} ${state.busy ? 'disabled' : ''}>Include in comparison</label><div class="route-head"><h3>${escapeHtml(r.bank || routeId(r))}</h3><span class="badge ${synthetic ? 'stale' : 'uncertain'}">${escapeHtml(readable(sourceState))}</span></div><p class="route-meta">${escapeHtml(r.routeName || '')} · requirements version ${escapeHtml(r.requirementsVersion ?? '—')}${r.coverage === 'partial' ? ' · partial coverage' : ''}</p>${synthetic ? '<p class="route-meta">No bank policy verified</p>' : ''}${r.scopeNote ? `<p class="route-meta">${escapeHtml(r.scopeNote)}</p>` : ''}${r.eligibilityRules?.length ? `<p class="route-meta">Published route conditions: ${r.eligibilityRules.length} · assessed after analysis</p>` : ''}<details class="route-details"><summary>View ${requirementsFor(r).length} requirements and sources</summary>${requirementsFor(r).map(req=>`<div class="item"><strong>${escapeHtml(req.label || req.description || req.id)}</strong>${req.conditional ? '<p>Conditional · confirm applicability</p>' : ''}${sourceMarkup(sourceFor(r,req.sourceId))}</div>`).join('') || '<p class="route-meta">No reviewed requirements yet.</p>'}</details></article>`;
  }).join('') || '<div class="panel empty">No routes are available for this session.</div>';
  $('routes').querySelectorAll('.choose-route').forEach(input=>input.addEventListener('change',()=>{
    if(input.checked) state.selectedRoutes.add(input.dataset.route); else state.selectedRoutes.delete(input.dataset.route);
    try { localStorage.setItem(selectionKey(),JSON.stringify(selectedRouteIds())); } catch {}
    state.pendingAnalyze=null; renderComparison(); updateButtons();
  }));
  renderComparison(); updateSelectors(); updateButtons();
}
function renderComparison() {
  const routes=state.routes.filter(r=>state.selectedRoutes.has(routeId(r)));
  $('selectionSummary').textContent=`${routes.length} ${routes.length===1 ? 'route' : 'routes'} selected`;
  $('comparison').innerHTML=routes.length ? `<table><caption>Selected banking routes</caption><thead><tr><th scope="col">Bank / channel</th><th scope="col">Checklist</th><th scope="col">Open items</th><th scope="col">Route limits</th></tr></thead><tbody>${routes.map(r=>{
    const pkg=packageFor(routeId(r)), stale=pkg && (state.dirtyRoutes.has(pkg.routeId) || pkg.state==='stale');
    const counts=kind=>(pkg?.items || []).filter(item=>item.status===kind).length;
    const status=!pkg ? 'Not analyzed' : stale ? 'Reanalysis required' : readable(pkg.status);
    const open=!pkg || stale ? 'Analyze to check documents' : `${counts('missing')} missing · ${counts('uncertain')} to review`;
    const limits=stale ? 'Recheck after analysis' : pkg?.routeEligibility?.rationale || r.scopeNote || 'Confirm published channel conditions';
    return `<tr><th scope="row">${escapeHtml(r.bank)}<small>${escapeHtml(r.channel==='unknown' ? 'Channel unconfirmed' : readable(r.channel))}</small></th><td>${escapeHtml(status)}<small>${requirementsFor(r).length} requirements${r.coverage==='partial' ? ' · partial coverage' : ''}</small></td><td>${escapeHtml(open)}</td><td>${escapeHtml(limits)}</td></tr>`;
  }).join('')}</tbody></table>` : '<p>Select at least one banking route below.</p>';
}
function renderPackages() {
  $('packages').innerHTML = state.packages.map(pkg=>{
    const r = routeById(pkg.routeId);
    const stale = state.dirtyRoutes.has(pkg.routeId) || pkg.state === 'stale';
    const eligibility=pkg.routeEligibility;
    return `<article class="panel route-card"><div class="route-head"><h3>${escapeHtml(pkg.bank || r?.bank || pkg.routeId)}</h3><span class="badge ${stale ? 'stale' : pkg.status === 'ready' ? 'ready' : 'uncertain'}">${escapeHtml(stale ? 'Reanalysis required' : `${readable(pkg.state || 'draft')} · ${readable(pkg.status || 'needs review')}`)}</span></div><p class="route-meta">Package ${escapeHtml(pkg.id || '—')} · revision ${escapeHtml(pkg.revision ?? '—')} · requirements v${escapeHtml(pkg.requirementsVersion ?? '—')}</p>${eligibility ? `<div class="eligibility"><strong>Route eligibility: ${escapeHtml(readable(eligibility.status))}</strong><p>${escapeHtml(eligibility.rationale)}</p>${(eligibility.sourceIds || []).map(id=>sourceMarkup(sourceFor(r,id))).join('')}</div>` : ''}<details class="package-details"><summary>View checklist · ${(pkg.items || []).filter(i=>i.status==='missing').length} missing · ${(pkg.items || []).filter(i=>i.status==='uncertain').length} to review</summary>${(pkg.items || []).map(item=>{
      const requirement = requirementsFor(r).find(x=>String(x.id) === String(item.requirementId));
      const specific = item.origin === 'follow_up' || String(item.requirementId).startsWith('follow-up:');
      return `<div class="item"><div class="item-top"><strong>${escapeHtml(specific ? item.label || pkg.followUp?.requestedItem || 'Specific bank request' : requirement?.label || item.requirementId)}</strong><span class="badge ${escapeHtml(item.status)}">${escapeHtml(readable(item.status))}</span></div><p>${escapeHtml(item.rationale || '')}</p><small>Evidence: ${escapeHtml((item.evidenceIds || []).join(', ') || 'none')}</small>${specific ? '<div class="source">Entered by user for this request · not a published bank rule</div>' : sourceMarkup(sourceFor(r,item.sourceId || requirement?.sourceId))}</div>`;
    }).join('')}</details><details class="package-history"><summary>Version history</summary><button class="secondary load-history" data-package="${escapeHtml(pkg.id)}">Load saved versions</button><div class="history-rows"></div></details></article>`;
  }).join('') || '<div class="panel empty">Analyze the routes to prepare checklists.</div>';
  $('packages').querySelectorAll('.load-history').forEach(button => button.addEventListener('click',async()=>{
    button.disabled=true;
    const target=button.nextElementSibling;
    try {
      const result=await request(`/api/packages/${encodeURIComponent(button.dataset.package)}/history?sessionId=${encodeURIComponent(state.sessionId)}`);
      target.innerHTML=(result.snapshots || []).map(snapshot=>`<div class="item"><strong>Revision ${snapshot.revision} · ${escapeHtml(readable(snapshot.state))}</strong><p>Requirements v${snapshot.requirementsVersion} · ${escapeHtml(snapshot.approvedAt || 'Not approved')}</p><small>${snapshot.items.filter(item=>item.status==='ready' || item.status==='not_applicable').length}/${snapshot.items.length} items supported</small></div>`).join('');
    } catch(error) {target.textContent=error.message;} finally {button.disabled=false;}
  }));
  renderComparison(); updateSelectors(); updateButtons();
}
function updateButtons() {
  $('analyze').disabled=state.busy || !selectedRouteIds().length;
  $('analyze').textContent=state.busy ? 'Working…' : `Analyze ${selectedRouteIds().length || 'selected'} ${selectedRouteIds().length===1 ? 'route' : 'routes'}`;
  const pkg = packageFor($('exportRoute').value);
  const current = pkg && !state.dirtyRoutes.has(pkg.routeId) && pkg.state !== 'stale';
  $('draftExport').disabled = state.busy || !current;
  $('draftExport').textContent = pkg?.state === 'approved' ? 'Download approved' : 'Download draft';
  $('printExport').disabled = state.busy || !current;
  $('approve').disabled = state.busy || !current || pkg.status !== 'ready' || pkg.state === 'approved';
  const followPackage = packageFor($('followRoute').value);
  $('followUp').disabled = state.busy || state.profileDirty || !followPackage || followPackage.state === 'stale';
  $('approveSource').disabled = state.busy || !state.selectedCandidate || state.selectedCandidate.status !== 'pending' || !state.selectedCandidate.eligible;
  $('rejectSource').disabled = state.busy || !state.selectedCandidate || state.selectedCandidate.status !== 'pending';
}
function markDirty(profile=false) {
  if(state.decision?.assessment) state.decision.stale=true; renderSelection();
  state.profileDirty ||= profile;
  state.pendingAnalyze=null;
  for (const pkg of state.packages) state.dirtyRoutes.add(pkg.routeId);
  $('followResult').hidden = true;
  renderPackages();
  notice(profile ? 'Unsaved profile edits. Analyze to save them and recalculate packages.' : 'Unsaved evidence change. Analyze to save it or apply it to a bank follow-up; existing packages need review.');
}
function modeMessage(mode) {
  if (mode === 'live-model') return 'Nemotron analyzed the selected route requirements.';
  if (mode === 'fixture') return 'Deterministic analysis completed. No live model call was made.';
  return `Analysis mode: ${readable(mode || 'unreported')}.`;
}
function applySession(demo) {
  if (!demo.sessionId) throw new Error('Server did not provide a session ID');
  state.decision=demo.decision || null; state.needsDirty=false;
  state.demo=demo; state.sessionId=demo.sessionId; state.inputRevision=demo.inputRevision ?? 0;
  state.routes=demo.requirementsByRoute || demo.routes || []; state.packages=demo.packages || [];
  let saved; try { saved=JSON.parse(localStorage.getItem(selectionKey())); } catch {}
  state.selectedRoutes=new Set(Array.isArray(saved) ? saved.filter(id=>state.routes.some(r=>routeId(r)===id)) : state.routes.slice(0,2).map(routeId));
  state.candidates=[]; state.selectedCandidate=null; state.mode=demo.mode || null; state.sourceMode=null;
  state.profileDirty=false; state.dirtyRoutes.clear(); state.evidenceRevision=0; state.pendingAnalyze=null;
  pendingCommands.clear(); requestIds.clear();
  $('dataMode').value=demo.mode === 'research' ? 'research' : 'fixture';
  renderNeeds(); renderProfile(); renderRoutes(); renderPackages(); $('candidateReview').hidden=true; $('liveSources').innerHTML=''; $('sourceMode').textContent='No refresh yet';
  $('followText').value=demo.followUp?.text || '';
  $('manualReview').checked=false; $('manualFields').hidden=true; $('manualItems').innerHTML=''; addManualItem();
  restoreReply();
  try { localStorage.setItem(sessionStorageKey,demo.sessionId); } catch {}
}
async function reset() {
  busy(true); notice('Starting a new session…');
  try {
    const mode=$('dataMode').value, demo=await request(`/api/demo${mode === 'research' ? '?mode=research' : ''}`);
    applySession(demo);
    notice(mode === 'research' ? 'Research session started. Review route applicability and sources before analysis.' : 'Fictional example loaded. No real bank policy has been verified.');
  } catch(err) { notice(`Session could not start: ${err.message}`,true); }
  finally { busy(false); }
}
async function bootstrap() {
  let id; try { id=localStorage.getItem(sessionStorageKey); } catch {}
  if (!id) return reset();
  busy(true); notice('Restoring your demo session…');
  try { const demo=await request(`/api/sessions/${encodeURIComponent(id)}`); applySession(demo); notice('Demo session restored. Review dated sources and package revisions before export.'); }
  catch { try {localStorage.removeItem(sessionStorageKey);} catch {} await reset(); }
  finally { busy(false); }
}
async function analyze() {
  if (!state.sessionId) return notice('Start a session first.',true);
  if (!selectedRouteIds().length) return notice('Select at least one banking route.',true);
  busy(true); notice('Preparing route packages…');
  try {
    const signature=JSON.stringify({sessionId:state.sessionId,baseInputRevision:state.inputRevision,profile:readProfile(),evidence:state.demo.evidence,routeIds:selectedRouteIds(),requirementsVersions:state.routes.map(r=>r.requirementsVersion)});
    if (!state.pendingAnalyze || state.pendingAnalyze.signature !== signature) state.pendingAnalyze={signature,payload:{sessionId:state.sessionId,baseInputRevision:state.inputRevision,idempotencyKey:freshKey(),profile:readProfile(),evidence:state.demo.evidence,routeIds:selectedRouteIds()}};
    const result=await request('/api/analyze',state.pendingAnalyze.payload);
    state.demo.profile=structuredClone(state.pendingAnalyze.payload.profile); state.pendingAnalyze=null;
    state.packages=result.packages || []; state.mode=result.mode; state.inputRevision=result.inputRevision ?? state.inputRevision; state.profileDirty=false; state.dirtyRoutes.clear();
    renderPackages();
    notice(`${modeMessage(result.mode)} Source status: ${readable(result.sourcesMode || state.sourceMode || 'check route cards')}. ${(result.warnings || []).join(' ')}`);
  } catch(err) { if (err.status && err.status < 500 && err.status !== 429) state.pendingAnalyze=null; notice(err.status === 409 ? 'Company inputs changed in another window. Open Session controls and choose Reload saved session before analyzing again.' : `Analysis failed: ${err.message}. Select Analyze routes again to retry; your inputs are still here.`,true); }
  finally { busy(false); }
}
function renderCandidates(routeIdValue) {
  const r=routeById(routeIdValue);
  $('liveSources').innerHTML=state.candidates.map(c=>`<div class="item candidate"><div class="item-top"><strong>${escapeHtml(c.source?.title || c.source?.url || c.id)}</strong><span class="badge ${c.status === 'approved' ? 'ready' : c.status === 'rejected' ? 'missing' : 'uncertain'}">${escapeHtml(c.status || 'pending')}</span></div>${sourceMarkup(c.source)}<p>${escapeHtml((c.source?.excerpt || '').slice(0,600))}</p><small>${c.changed ? 'Content changed · ' : ''}${c.eligible ? 'Eligible for review' : `Needs review: ${(c.reasons || []).join('; ')}`}</small><div><button class="secondary candidate-select" data-candidate="${escapeHtml(c.id)}" aria-label="Compare and review ${escapeHtml(c.source?.title || c.source?.url || c.id)}">Compare &amp; review</button></div></div>`).join('') || '<p class="route-meta">No source candidates available. Existing requirements remain unchanged.</p>';
  $('liveSources').querySelectorAll('.candidate-select').forEach(b=>b.addEventListener('click',()=>{if (!state.busy) selectCandidate(b.dataset.candidate);}));
  if (r && state.selectedCandidate && !state.candidates.some(c=>c.id === state.selectedCandidate.id)) {state.selectedCandidate=null; $('candidateReview').hidden=true;}
}
function renderRequirementRows() {
  const r=routeById($('sourceRoute').value), c=state.selectedCandidate;
  if (!r || !c) return;
  let lines; try { lines=JSON.parse($('reviewRequirements').value); } catch { return; }
  const sources=[...sourcesFor(r),c.source].filter((source,index,all)=>all.findIndex(x=>x.id === source.id) === index);
  $('requirementRows').innerHTML=lines.map((line,index)=>`<div class="requirement-row" data-index="${index}"><label>Requirement ID<input class="req-id" value="${escapeHtml(line.id)}" ${index < requirementsFor(r).length ? 'readonly' : ''}></label><label>What the bank requests<input class="req-label" value="${escapeHtml(line.label || '')}"></label><label>Evidence type<input class="req-evidence" value="${escapeHtml(line.evidenceType || line.evidenceKinds?.[0] || '')}"></label><label>Supporting source<select class="req-source">${sources.map(s=>`<option value="${escapeHtml(s.id)}" ${line.sourceId === s.id ? 'selected' : ''}>${escapeHtml(s.id === c.source.id ? 'New candidate: ' : 'Current: ')}${escapeHtml(s.title || s.url || s.id)}</option>`).join('')}</select></label>${line.condition || line.conditional ? `<p class="subtle full">Applicability: ${escapeHtml(line.condition ? JSON.stringify(line.condition) : 'conditional; confirm before treating as required')}</p>` : ''}</div>`).join('');
}
function selectCandidate(id) {
  const c=state.candidates.find(x=>String(x.id) === String(id)), r=routeById($('sourceRoute').value);
  if (!c || !r) return;
  state.selectedCandidate=c;
  $('candidateReview').hidden=false;
  $('candidateTitle').textContent=`Review: ${c.source?.title || c.source?.url || c.id}`;
  $('currentSourceSummary').innerHTML=sourcesFor(r).map(s=>`${sourceMarkup(s)}<p>${escapeHtml((s.excerpt || '').slice(0,600))}</p>`).join('') || '<p>No current source.</p>';
  $('candidateSourceSummary').innerHTML=`${sourceMarkup(c.source)}<p>${escapeHtml((c.source?.excerpt || '').slice(0,900))}</p><p>${c.changed ? 'Content differs from the saved source.' : 'No content change detected from the saved source.'}</p>`;
  $('reviewRequirements').value=JSON.stringify(requirementsFor(r),null,2);
  renderRequirementRows();
  $('reviewHint').textContent=`Source retrieved ${prettyDate(c.source?.retrievedAt)}. Confirm that this page applies to the selected company, channel and country. Conditional rules remain conditional.`;
  updateButtons();
}
function reviewedRequirements() {
  const lines=JSON.parse($('reviewRequirements').value);
  if (!Array.isArray(lines)) throw new Error('Advanced requirements must be an array.');
  const rows=[...$('requirementRows').querySelectorAll('.requirement-row')];
  if (rows.length !== lines.length) throw new Error('Requirement rows changed. Select the candidate again.');
  return rows.map((row,index)=>({
    ...lines[index],
    id:row.querySelector('.req-id').value.trim(),
    label:row.querySelector('.req-label').value.trim(),
    evidenceType:row.querySelector('.req-evidence').value.trim(),
    sourceId:row.querySelector('.req-source').value,
  }));
}
async function loadSources(refresh=false) {
  const routeIdValue=$('sourceRoute').value;
  if (!routeIdValue || !state.sessionId) return notice('Select a route in an active session.',true);
  busy(true); notice(refresh ? 'Refreshing this route’s source candidates…' : 'Loading source candidates…');
  try {
    const result=refresh ? await request('/api/sources/refresh',{sessionId:state.sessionId,routeId:routeIdValue}) : await request(`/api/routes/${encodeURIComponent(routeIdValue)}/sources?sessionId=${encodeURIComponent(state.sessionId)}`);
    if (result.route) { state.routes=state.routes.map(r=>String(routeId(r)) === routeIdValue ? result.route : r); renderRoutes(); }
    state.candidates=result.candidates || []; state.selectedCandidate=null; $('candidateReview').hidden=true; state.sourceMode=result.mode || null;
    $('sourceMode').textContent=result.mode === 'saved-fallback' ? 'Saved sources · no live refresh' : result.mode === 'live-tavily' ? 'Live search · review required' : readable(result.mode || 'Source candidates');
    renderCandidates(routeIdValue);
    if (refresh) notice(`${state.candidates.length} candidate(s). ${result.mode === 'saved-fallback' ? 'Live search unavailable; retrieval dates shown are original saved dates.' : 'Review the source and each requirement before approval.'} ${(result.errors || []).map(e=>typeof e === 'string' ? e : e.message || '').join(' ')}`);
  } catch(err) { notice(`Could not load source candidates: ${err.message}`,true); }
  finally { busy(false); }
}
async function reviewSource(decision) {
  const routeIdValue=$('sourceRoute').value, r=routeById(routeIdValue), c=state.selectedCandidate;
  if (!r || !c) return notice('Select a source candidate first.',true);
  let requirements=undefined;
  if (decision === 'approve') {
    try { requirements=reviewedRequirements(); } catch(err) { return notice(`Review could not be saved: ${err.message}`,true); }
    if (!requirements.length || !requirements.every(x=>x.id && x.label && x.evidenceType && x.sourceId)) return notice('Complete each requirement ID, description, evidence type and source.',true);
    if (!requirements.some(x=>x.sourceId === c.source?.id)) return notice('Assign the candidate sourceId to at least one reviewed requirement, or reject the candidate.',true);
  }
  busy(true); notice(decision === 'approve' ? 'Saving reviewed source and requirements…' : 'Rejecting candidate…');
  try {
    const result=await request(`/api/routes/${encodeURIComponent(routeIdValue)}/source-review`,{sessionId:state.sessionId,baseVersion:r.requirementsVersion,candidateId:c.id,decision,requirements});
    if (result.route) state.routes=state.routes.map(old=>String(routeId(old)) === routeIdValue ? result.route : old);
    if (decision === 'approve') { state.pendingAnalyze=null; if(state.decision?.assessment){state.decision.stale=true;renderSelection();} }
    if (result.packages) state.packages=result.packages;
    else for (const pkg of state.packages) if (pkg.routeId === routeIdValue) state.dirtyRoutes.add(pkg.routeId);
    state.selectedCandidate=null; $('candidateReview').hidden=true; renderRoutes(); renderPackages(); await loadSources(false);
    notice(decision === 'approve' ? 'Reviewed source saved. Reanalyze any stale package before export.' : 'Candidate rejected. Route requirements were not replaced.');
  } catch(err) { notice(err.status === 409 ? 'Source version changed. Select Reload saved review, compare the updated requirements, then try again.' : `Source review failed: ${err.message}. Your edits are still visible.`,true); }
  finally { busy(false); }
}
async function followUp() {
  const routeIdValue=$('followRoute').value, pkg=packageFor(routeIdValue), text=$('followText').value.trim();
  if (!pkg) return notice('Analyze this route first.',true);
  if (!text) return notice('Enter the bank request.',true);
  if (state.profileDirty) return notice('Profile changed. Reanalyze before handling this request.',true);
  const humanReviewed=$('manualReview').checked;
  const requestedItems=humanReviewed ? [...$('manualItems').children].map(row=>({id:row.dataset.id,label:row.querySelector('.manual-label').value.trim(),evidenceType:row.querySelector('.manual-evidence-type').value,subject:row.querySelector('.manual-subject').value === 'representative' ? $('representative').value.trim() : 'company'})) : undefined;
  if (humanReviewed && (!requestedItems.length || requestedItems.some(item=>!item.label || !item.evidenceType || !item.subject))) return notice('Describe every requested item, evidence type and person before confirming your classification.',true);
  busy(true); notice('Preparing route-specific response draft…');
  try {
    const requestSignature=`${state.sessionId}:${routeIdValue}:${text}`;
    const previous=(pkg.followUps || []).find(item=>item.text === text);
    if(!requestIds.has(requestSignature)) requestIds.set(requestSignature,previous?.id || (text === state.demo.followUp?.text && routeIdValue === state.demo.followUp?.routeId ? state.demo.followUp.id : `request-${freshKey()}`));
    const result=await command('/api/follow-up',{sessionId:state.sessionId,packageId:pkg.id,baseRevision:pkg.revision,followUp:{id:requestIds.get(requestSignature),routeId:routeIdValue,text,humanReviewed,requestedItems},newEvidence:state.demo.evidence});
    const revised=result.packageSnapshot || result.package;
    if (!revised) throw new Error('No revised package returned');
    state.packages=state.packages.map(p=>p.id === pkg.id || p.routeId === routeIdValue ? revised : p);
    state.dirtyRoutes.delete(routeIdValue); renderPackages();
    $('responseDraft').value=savedReply(revised.id) ?? result.proposedResponse ?? revised.followUp?.proposedResponse ?? '';
    $('followResult').hidden=false;
    notice('A new package revision is ready for review. The bank has not received a response.');
  } catch(err) { notice(err.status === 409 ? 'Package changed. Reload or analyze again before retrying the follow-up.' : `Follow-up failed: ${err.message}`,true); }
  finally { busy(false); }
}
function saveJson(payload,name) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const link=document.createElement('a'); link.href=url; link.download=name; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function exportPackage(kind) {
  const pkg=packageFor($('exportRoute').value);
  if (!pkg || state.dirtyRoutes.has(pkg.routeId) || pkg.state === 'stale') return notice('Reanalyze the selected route before export.',true);
  if (kind === 'approved' && pkg.state !== 'approved') return notice('Server approval is required before downloading an approved package.',true);
  busy(true); notice('Retrieving the server’s current export…');
  try {
    const payload=await request(`/api/packages/${encodeURIComponent(pkg.id)}/export?sessionId=${encodeURIComponent(state.sessionId)}`);
    const exported=payload.packageSnapshot || payload.package || payload;
    if (kind === 'approved' && exported.state !== 'approved') throw new Error('Server did not confirm an approved package');
    const name=`banking-${exported.state === 'approved' ? 'approved-package' : 'draft-checklist'}-${String(pkg.routeId).replace(/[^\w-]/g,'-')}.json`;
    saveJson(payload,name);
    notice(exported.state === 'approved' ? 'Server-approved export downloaded. Nothing was sent to a bank.' : 'Server draft checklist downloaded with open items. Nothing was sent to a bank.');
  } catch(err) { notice(`Export failed: ${err.message}`,true); }
  finally { busy(false); }
}
async function approve() {
  const pkg=packageFor($('exportRoute').value);
  if (!pkg || state.dirtyRoutes.has(pkg.routeId) || pkg.state === 'stale') return notice('Reanalyze before approval.',true);
  if (pkg.status !== 'ready') return notice('Open items remain. Download a draft checklist instead.',true);
  busy(true); notice('Requesting server approval…');
  try {
    const response = pkg.followUp ? (currentFollowPackage()?.id === pkg.id ? $('responseDraft').value : savedReply(pkg.id) ?? pkg.followUp.proposedResponse) : undefined;
    const result=await command('/api/approve',{sessionId:state.sessionId,packageId:pkg.id,baseRevision:pkg.revision,response});
    const approved=result.packageSnapshot || result.package;
    if (!approved || approved.state !== 'approved') throw new Error('Server did not confirm approval');
    state.packages=state.packages.map(p=>p.id === pkg.id ? approved : p); renderPackages();
    try {localStorage.removeItem(replyKey(pkg.id));} catch {}
    await exportPackage('approved');
  } catch(err) { notice(err.status === 409 ? 'Package revision or requirements changed. Reanalyze before approval.' : `Approval failed: ${err.message}`,true); }
  finally { busy(false); }
}
$('reload').addEventListener('click',reset);
$('resume').addEventListener('click',async () => { if (!state.sessionId) return reset(); busy(true); try { applySession(await request(`/api/sessions/${encodeURIComponent(state.sessionId)}`)); notice('Saved session reloaded. Unsaved profile and evidence edits were discarded.'); } catch(error) { notice(`Could not reload the saved session: ${error.message}. Start a new session if it expired.`,true); } finally { busy(false); } });
$('deleteSession').addEventListener('click',async () => {
  if (!state.sessionId) return;
  busy(true);
  try {
    const response=await fetch(`/api/sessions/${encodeURIComponent(state.sessionId)}`,{method:'DELETE'});
    if (!response.ok) throw new Error('Could not delete this demo session.');
    try { localStorage.removeItem(sessionStorageKey); for (const key of Object.keys(localStorage)) if(key.startsWith(`BBN_REPLY_${state.sessionId}_`)) localStorage.removeItem(key); } catch {}
    await reset(); notice('Previous demo session deleted. A new synthetic session is ready.');
  } catch(error) { notice(error.message,true); } finally { busy(false); }
});
$('dataMode').addEventListener('change',reset);
$('analyze').addEventListener('click',analyze);
$('refreshSources').addEventListener('click',()=>loadSources(true));
$('reloadSources').addEventListener('click',()=>loadSources(false));
$('sourceRoute').addEventListener('change',()=>loadSources(false));
$('approveSource').addEventListener('click',()=>reviewSource('approve'));
$('rejectSource').addEventListener('click',()=>reviewSource('reject'));
$('addRequirement').addEventListener('click',()=>{
  if (!state.selectedCandidate) return;
  let lines; try { lines=reviewedRequirements(); } catch { return notice('Fix advanced requirement JSON before adding a line.',true); }
  lines.push({id:`NEW-${Date.now()}`,label:'',evidenceType:'',subject:'company',sourceId:state.selectedCandidate.source.id});
  $('reviewRequirements').value=JSON.stringify(lines,null,2); renderRequirementRows();
});
$('followUp').addEventListener('click',followUp);
$('followRoute').addEventListener('change',()=>{restoreReply();updateButtons();});
$('manualReview').addEventListener('change',()=>{$('manualFields').hidden=!$('manualReview').checked;});
$('addManualItem').addEventListener('click',addManualItem);
const bankingFeatures={online:'Online opening',branch:'Opening at a branch',multi_currency:'Hold balances in several currencies',team_cards:'Cards for team members',local_payments:'Portuguese reference / tax payments'};
function renderNeeds() {
  const needs=state.decision?.needs || {};
  $('needLegalForm').value=needs.legalForm || ''; $('needCurrencies').value=(needs.currencies || []).join(', '); $('needPayments').value=needs.monthlyPayments ?? '';$('needSepaPayments').value=needs.monthlySepaPayments ?? '';
  $('needsPriorities').innerHTML='<legend>What matters to your business?</legend>'+Object.entries(bankingFeatures).map(([key,label])=>`<label>${escapeHtml(label)}<select id="priority-${key}"><option value="irrelevant">Not needed</option><option value="preference">Prefer it</option><option value="mandatory">Must have</option></select></label>`).join('');
  for(const key of Object.keys(bankingFeatures))$('priority-'+key).value=needs.priorities?.[key] || 'irrelevant';
  $('quickGoals').innerHTML='<legend>What would you like your bank to do?</legend>'+Object.entries(bankingFeatures).map(([key,label])=>`<label class="goal-choice"><input type="checkbox" id="goal-${key}" ${needs.priorities?.[key] && needs.priorities[key]!=='irrelevant' ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`).join('');
  for(const key of Object.keys(bankingFeatures)){
    $('goal-'+key).addEventListener('change',()=>{$('priority-'+key).value=$('goal-'+key).checked ? 'preference' : 'irrelevant';state.needsDirty=true;renderSelection();});
    $('priority-'+key).addEventListener('input',()=>{$('goal-'+key).checked=$('priority-'+key).value!=='irrelevant';});
  }

  $('needsForm').querySelectorAll('input,select').forEach(el=>el.addEventListener('input',()=>{state.needsDirty=true;renderSelection();}));
  renderSelection();
}
function readNeeds(){return {legalForm:$('needLegalForm').value,currencies:$('needCurrencies').value.split(',').map(v=>v.trim().toUpperCase()).filter(Boolean),monthlyPayments:$('needPayments').value==='' ? null : Number($('needPayments').value),monthlySepaPayments:$('needSepaPayments').value==='' ? null : Number($('needSepaPayments').value),priorities:Object.fromEntries(Object.keys(bankingFeatures).map(key=>[key,$('priority-'+key).value]))};}
function tariffMarkup(row){
 if(!row.tariffs?.length)return '<p class="subtle">Tariff coverage not established for this route and profile.</p>';
 const money=cents=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(cents/100);
 return `<details class="tariff-details"><summary>Published tariffs · known costs only</summary><p>Known subtotal, not a complete cost comparison. Product and tax terms differ; fees do not affect ranking.</p>${row.tariffs.map(t=>`<div class="tariff-plan"><h5>${escapeHtml(t.name)}</h5><p><strong>Known subtotal: ${money(t.knownMonthlySubtotalCents)}/month${t.billing==='annual' ? ' equivalent' : ''}</strong> · ${escapeHtml(t.tax)}</p><p>${t.billing==='annual' ? `Annual subscription paid upfront: ${money(t.annualSubscriptionCents)}. ${t.includedSepaPayments} SEPA transfers/direct debits per month included; ${money(t.extraSepaPaymentCents)} per extra operation.` : 'Monthly subscription only. Confirm this product is appropriate for the company.'}</p><p>${t.usageKnown ? `SEPA overage in your monthly scenario: ${money(t.sepaOverageCents)}.` : t.billing==='annual' ? 'SEPA usage unknown: variable charges are not calculated.' : 'Variable operation charges are not calculated.'}</p>${t.notes ? `<p>${escapeHtml(t.notes)}</p>` : ''}<p>Not included: ${t.exclusions.map(escapeHtml).join(', ')}.</p>${sourceMarkup(t.source)}</div>`).join('')}<p>Product-level capabilities do not establish that all services are included in every plan. Bank acceptance is assessed separately.</p></details>`;

}
function renderSelection(){
 const decision=state.decision, assessment=decision?.assessment;
 if(state.needsDirty || decision?.stale){$('selectionResults').innerHTML='<div class="panel"><h3>Needs changed or company sources need rechecking</h3><p>Find banking options again before choosing. Saved results remain in your decision history.</p></div>';return;}
 if(!assessment){$('selectionResults').innerHTML='<p class="subtle">Save a draft or describe at least one need to assess options.</p>';return;}
 const chosen=routeById(decision.chosenRouteId);
 const rows=(items,allowChoice)=>items.map(row=>`<article class="panel selection-option"><h4>${escapeHtml(row.bank)}</h4><p>${escapeHtml(row.channel)} · ${row.mandatoryMatches} confirmed essential needs · ${row.preferenceMatches} confirmed preferences${row.tied ? ' · equal confirmed coverage' : ''}</p><p>${escapeHtml(row.eligibility.rationale)}</p><ul>${row.reasons.map(reason=>`<li>${escapeHtml(reason)}</li>`).join('')}</ul>${row.questions.length ? `<h5>Questions to confirm</h5><ul>${row.questions.map(question=>`<li>${escapeHtml(question)}</li>`).join('')}</ul>` : ''}<p>${escapeHtml(row.nextAction)}</p><details><summary>Evidence behind this option</summary>${row.facts.map(fact=>`<p><strong>${escapeHtml(fact.label)}</strong>: ${fact.value==='unknown' ? 'Not established' : fact.value ? 'Published as supported' : 'Published as unsupported'} · ${escapeHtml(fact.priority)}</p>${sourceMarkup(fact.source)}`).join('')}</details>${tariffMarkup(row)}${allowChoice ? `<button class="secondary choose-option" data-route="${escapeHtml(row.routeId)}" ${state.busy ? 'disabled' : ''}>${assessment.clarify.includes(row) ? 'Choose to investigate' : 'Choose this option'}</button>` : ''}</article>`).join('');
 $('selectionResults').innerHTML=`<section class="selection-summary-panel"><div class="decision-actions"><h3>Banking options</h3><div><button id="printDecision" class="secondary">Print / save comparison</button><button id="downloadDecision" class="secondary">Download comparison</button></div></div><p>This is not a cost comparison of all providers. Published tariff subtotals appear where verified. Confirmed essential support comes first, then confirmed preferences. Reviews and fees do not influence the order. Unknown support is not a negative review; bank acceptance is not guaranteed.</p>${chosen ? `<p><strong>Chosen: ${escapeHtml(chosen.bank)}</strong> · confirm open questions before preparing documents.</p>` : ''}<h4>Shortlist</h4>${assessment.shortlist.length ? rows(assessment.shortlist,true) : '<p>No route has both established mandatory support and published eligibility for this profile.</p>'}<h4>Need confirmation</h4><div class="route-grid">${rows(assessment.clarify,true) || '<p>No additional routes to clarify.</p>'}</div><details><summary>Routes outside the stated requirements (${assessment.excluded.length})</summary>${rows(assessment.excluded,false) || '<p>None excluded by confirmed conditions.</p>'}</details></section>`;
 $('printDecision').addEventListener('click',()=>{if(!state.busy && !state.profileDirty && !state.needsDirty && !state.decision?.stale)window.open(`/api/sessions/${encodeURIComponent(state.sessionId)}/decision/print`,'_blank','noopener,noreferrer');});
 $('downloadDecision').addEventListener('click',()=>{if(!state.busy && !state.profileDirty && !state.needsDirty && !state.decision?.stale){const link=document.createElement('a');link.href=`/api/sessions/${encodeURIComponent(state.sessionId)}/decision/export`;link.download='banking-comparison.json';link.click();}});
 $('selectionResults').querySelectorAll('.choose-option').forEach(button=>button.addEventListener('click',async()=>{
  busy(true);try{const result=await command('/api/selection/choose',{sessionId:state.sessionId,baseRevision:state.decision.revision,routeId:button.dataset.route});state.decision=result.decision;state.selectedRoutes=new Set([button.dataset.route]);try{localStorage.setItem(selectionKey(),JSON.stringify(selectedRouteIds()));}catch{}renderRoutes();$('sourceRoute').value=button.dataset.route;$('preparation').open=true;renderSelection();$('preparation').scrollIntoView({behavior:'smooth',block:'start'});notice('Option chosen. Confirm open questions before preparing documents.');}catch(e){notice(e.message,true);}finally{busy(false);}
 }));
}
async function saveBankingNeeds(assess){busy(true);try{const result=await command(`/api/selection/${assess?'assess':'save'}`,{sessionId:state.sessionId,baseRevision:state.decision?.revision || 0,needs:readNeeds(),...(assess ? {profile:readProfile(),baseInputRevision:state.inputRevision} : {})});state.decision=result.decision;state.needsDirty=false;if(assess){state.demo.profile=readProfile();state.inputRevision=result.inputRevision;state.profileDirty=false;state.packages=result.packages || state.packages;renderPackages();}renderSelection();notice(assess ? 'Banking options assessed.' : 'Banking needs saved.');}catch(e){notice(e.message,true);}finally{busy(false);}}
$('saveNeeds').addEventListener('click',()=>saveBankingNeeds(false));$('assessNeeds').addEventListener('click',()=>saveBankingNeeds(true));
$('responseDraft').addEventListener('input',()=>{const pkg=currentFollowPackage(); if (pkg?.followUp) storeReply(pkg.id,$('responseDraft').value);});
$('draftExport').addEventListener('click',()=>exportPackage(packageFor($('exportRoute').value)?.state === 'approved' ? 'approved' : 'draft'));
$('printExport').addEventListener('click',()=>{const pkg=packageFor($('exportRoute').value);if(pkg && !state.dirtyRoutes.has(pkg.routeId) && pkg.state !== 'stale') window.open(`/api/packages/${encodeURIComponent(pkg.id)}/print?sessionId=${encodeURIComponent(state.sessionId)}`,'_blank','noopener,noreferrer');});
$('approve').addEventListener('click',approve);
$('exportRoute').addEventListener('change',updateButtons);
$('addEvidence').addEventListener('click',()=>{
  if (!state.demo) return;
  const name=$('newEvidence').value.trim(),type=$('newEvidenceType').value;
  if (!name) return notice('Name the synthetic document first.',true);
  const personEvidence=['identity','representative_id','representative_tax_id','representative_address','representative_income','online_identity_access','residence_permit','pep_declaration','representative_authority','participant_details','power_of_attorney'].includes(type);
  state.demo.evidence.push({id:`E-user-${freshKey()}`,name,type,subject:personEvidence ? $('representative').value.trim() : 'company',fields:type === 'ownership_chart' ? {owners:$('owners').value.split(',').map(x=>x.trim()).filter(Boolean)} : {},origin:'manual',synthetic:true});
  $('newEvidence').value=''; state.evidenceRevision++; renderEvidence(); markDirty();
});
for (const id of ['legalName','country','registrationNumber','businessActivity','businessAddress','representative','owners']) $(id).addEventListener('input',()=>markDirty(true));
bootstrap();
