import {validateNeeds,assessOptions,decisionView,publicSelectionCatalog} from './selection.mjs';
import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { demoData } from './demo-data.mjs';
import { buildPackages, applyFollowUp, approvePackage } from './domain.mjs';
import { inferWithNemotron, fetchBankSources } from './adapters.mjs';
import { DemoStore, failure, fingerprint } from './store.mjs';
import { sourceCandidates, reviewedRoute } from './sources.mjs';
import { printablePackage, printableDecision } from './exports.mjs';

const publicDir = resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); };
async function body(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw failure(415, 'CONTENT_TYPE', 'Use application/json.');
  let raw = '', size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 100_000) throw failure(413, 'BODY_LIMIT', 'Request too large.'); raw += chunk; }
  let input; try { input = JSON.parse(raw || '{}'); } catch { throw failure(400, 'INVALID_JSON', 'Invalid JSON.'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw failure(400, 'INVALID_INPUT', 'Expected an input object.');
  return input;
}
function syntheticInput(profile, evidence) {
  if (!profile || profile.synthetic !== true || !Array.isArray(evidence) || evidence.length > 50 || evidence.some(item => !item || item.synthetic !== true)) throw failure(400, 'SYNTHETIC_ONLY', 'This public demo accepts synthetic profiles and evidence only.');
  if (typeof profile.id !== 'string' || !profile.id || typeof profile.name !== 'string' || !profile.name.trim() || typeof profile.registrationNumber !== 'string' || !profile.registrationNumber.trim()) throw failure(400, 'PROFILE_INCOMPLETE', 'Add a synthetic company name and registration number.');
  if (JSON.stringify(profile).length > 8000 || JSON.stringify(evidence).length > 25_000) throw failure(400, 'INPUT_LIMIT', 'Synthetic input is too large.');
  const ids = new Set();
  for (const item of evidence) { if (typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.type !== 'string') throw failure(400, 'EVIDENCE_INVALID', 'Evidence needs a unique ID and type.'); ids.add(item.id); }
}
function routeFor(session, id) { const route = session.requirementsByRoute.find(item => item.routeId === id); if (!route) throw failure(404, 'ROUTE_NOT_FOUND', 'Route not found.'); return route; }
function packageResponse(session, pkg) { return { ...pkg, sources: pkg.sources || routeFor(session, pkg.routeId).sources }; }
function sessionResponse(session) {
  const evidence = [...new Map([...session.evidence, ...Object.values(session.packages).flatMap(pkg => pkg.attachedEvidence || [])].map(item => [item.id, item])).values()];
  return { sessionId: session.id, mode: session.mode, inputRevision: session.inputRevision, profile: session.profile, evidence, requirementsByRoute: session.requirementsByRoute, followUp: session.followUp, followUpEvidence: session.followUpEvidence, packages: Object.values(session.packages), coverage: session.coverage, coverageNote: session.coverageNote, decision: decisionView(session) };
}
function freshPackage(session, store, id, revision) {
  const pkg = store.package(session, id, revision), route = routeFor(session, pkg.routeId);
  if (pkg.state === 'stale' || pkg.requirementsVersion !== route.requirementsVersion || pkg.inputRevision !== session.inputRevision) throw failure(409, 'STALE_PACKAGE', 'Inputs or sources changed. Reanalyze before approval or export.');
  return pkg;
}

export function createAppServer({ env = process.env, infer = inferWithNemotron, search = fetchBankSources, selectionCatalog = publicSelectionCatalog, store = new DemoStore({ file: env.DATA_FILE }), log = () => {} } = {}) {
  const buckets = new Map(), pendingAnalyses = new Map();
  const server = createHttpServer(async (req, res) => {
    const requestId = randomUUID(), started = Date.now();
    res.setHeader('x-request-id', requestId); res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('referrer-policy', 'no-referrer');
    res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.on('finish', () => log({ requestId, method: req.method, status: res.statusCode, latencyMs: Date.now() - started }));
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/health' && req.method === 'GET') return json(res, 200, { status: 'ok' });
      if (url.pathname === '/ready' && req.method === 'GET') return json(res, 200, { status: 'ready', syntheticOnly: true, services: { nebiusConfigured: Boolean(env.NEBIUS_API_KEY), tavilyConfigured: Boolean(env.TAVILY_API_KEY) }, storage: env.DATA_FILE ? 'single-process-disk' : 'ephemeral' });
      const ip = req.socket.remoteAddress || 'unknown', now = Date.now();
      for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
      if (buckets.size > 2000 && !buckets.has(ip)) throw failure(429, 'RATE_LIMIT', 'Demo capacity reached. Try again later.');
      const bucket = buckets.get(ip) || { count: 0, live: 0, until: now + 60_000 }; buckets.set(ip, bucket);
      if (++bucket.count > Number(env.RATE_LIMIT || 120)) throw failure(429, 'RATE_LIMIT', 'Too many requests. Wait one minute.');
      if (req.method === 'POST' || req.method === 'DELETE') {
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw failure(403, 'ORIGIN', 'Use this demo from its own site.');
        if (['/api/analyze', '/api/sources/refresh'].includes(url.pathname) && ++bucket.live > Number(env.LIVE_RATE_LIMIT || 10)) throw failure(429, 'LIVE_RATE_LIMIT', 'Demo service budget reached. Wait one minute.');
      }
      if (req.method === 'GET' && url.pathname === '/api/demo') {
        const mode = url.searchParams.get('mode') || 'synthetic';
        let data = demoData;
        if (mode === 'research') { const module = await import('./research-data.mjs'); data = module.researchData; }
        else if (mode !== 'synthetic') throw failure(400, 'MODE', 'Choose synthetic or research mode.');
        const session = store.create({ ...data, mode, requirementsByRoute: data.requirementsByRoute.map(route => ({ ...route, requirementsVersion: route.requirementsVersion || 1 })) });
        return json(res, 200, sessionResponse(session));
      }
      const decisionExportMatch=url.pathname.match(/^\/api\/sessions\/([^/]+)\/decision\/(export|print)$/);
      if(decisionExportMatch && req.method==='GET'){
        const session=store.get(decisionExportMatch[1]),decision=decisionView(session);
        if(!decision?.assessment || decision.stale)throw failure(409,'STALE_DECISION','Find banking options again before exporting a comparison.');
        const snapshot={product:'Business Banking Navigator',synthetic:true,exportKind:'draft-banking-comparison',exportedAt:new Date().toISOString(),company:{name:session.profile.name,country:session.profile.country},decision:{revision:decision.revision,needs:decision.needs,chosenRouteId:decision.chosenRouteId,assessment:decision.assessment},disclaimer:'Partial costs and eligibility. Decision support is not bank acceptance. No application was sent.'};
        if(decisionExportMatch[2]==='print'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(printableDecision(snapshot));}
        res.setHeader('content-disposition',`attachment; filename="banking-comparison-r${decision.revision}.json"`);return json(res,200,snapshot);
      }
      const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
      if (sessionMatch && req.method === 'GET') return json(res, 200, sessionResponse(store.get(sessionMatch[1])));
      if (sessionMatch && req.method === 'DELETE') {
        store.delete(sessionMatch[1]);
        return json(res, 200, { deleted: true, policy: 'Synthetic demo state removed from active store. No real documents accepted.' });
      }
      if(req.method==='POST' && ['/api/selection/save','/api/selection/assess','/api/selection/choose'].includes(url.pathname)) {
        const input=await body(req), session=store.get(input.sessionId);
        const result=store.command(session,input.idempotencyKey,input,()=>{
          const prior=session.decision || {revision:0,history:[]};
          if(input.baseRevision!==prior.revision)throw failure(409,'DECISION_CONFLICT','Banking needs changed. Reload the saved session.');
          if(prior.history.length>=30)throw failure(429,'DECISION_LIMIT','Start a new synthetic session after thirty decision revisions.');
          const history=[...prior.history,...(prior.revision ? [{...prior,history:undefined}] : [])];
          if(url.pathname.endsWith('/choose')) {
            const view=decisionView(session);
            if(!view?.assessment || view.stale)throw failure(409,'DECISION_STALE','Assess current needs and sources before choosing.');
            if(![...view.assessment.shortlist,...view.assessment.clarify].some(row=>row.routeId===input.routeId))throw failure(400,'OPTION_INVALID','Choose a listed option or clarification route.');
            session.decision={...prior,history,revision:prior.revision+1,chosenRouteId:input.routeId};
          } else {
            const needs=validateNeeds(input.needs,url.pathname.endsWith('/assess'));
            if(url.pathname.endsWith('/assess') && input.profile) {
              if(input.baseInputRevision!==session.inputRevision)throw failure(409,'INPUT_REVISION_CONFLICT','Company inputs changed. Reload the session.');
              syntheticInput(input.profile,session.evidence);
              if(fingerprint(input.profile)!==fingerprint(session.profile)){session.profile=structuredClone(input.profile);session.inputRevision++;session.inputHash=fingerprint({profile:session.profile,evidence:session.evidence});store.invalidate(session,null,'inputs_changed');}
            }
            session.decision={revision:prior.revision+1,needs,history,chosenRouteId:null,assessment:url.pathname.endsWith('/assess') ? assessOptions(session,needs,selectionCatalog) : null};
          }
          return {decision:decisionView(session),inputRevision:session.inputRevision,packages:Object.values(session.packages)};
        });return json(res,200,result);
      }
      const routeMatch = url.pathname.match(/^\/api\/routes\/([^/]+)\/(sources|source-review)$/);
      if (routeMatch) {
        const input = req.method === 'POST' ? await body(req) : { sessionId: url.searchParams.get('sessionId') };
        const session = store.get(input.sessionId), route = routeFor(session, routeMatch[1]);
        if (req.method === 'GET' && routeMatch[2] === 'sources') return json(res, 200, { route, candidates: session.candidates[route.routeId] || [] });
        if (req.method === 'POST' && routeMatch[2] === 'source-review') {
          const result = store.mutate(session, () => {
            if (input.baseVersion !== route.requirementsVersion) throw failure(409, 'SOURCE_VERSION_CONFLICT', 'Requirements changed. Reload the source review.');
            const candidate = (session.candidates[route.routeId] || []).find(item => item.id === input.candidateId);
            if (!candidate || candidate.status !== 'pending') throw failure(409, 'CANDIDATE_NOT_PENDING', 'Candidate is unavailable or already reviewed.');
            if (input.decision === 'reject') candidate.status = 'rejected';
            else if (input.decision === 'approve') {
              const otherIds = new Set(session.requirementsByRoute.filter(item=>item.routeId !== route.routeId).flatMap(item=>item.requirements.map(requirement=>requirement.id)));
              if (Array.isArray(input.requirements) && input.requirements.some(requirement=>otherIds.has(requirement?.id))) throw failure(400, 'REQUIREMENT_ID_SCOPE', 'Requirement IDs must be distinct across routes.');
              const updated = reviewedRoute(route, candidate, input.requirements);
              session.requirementsByRoute = session.requirementsByRoute.map(item => item.routeId === route.routeId ? updated : item);
              candidate.status = 'approved'; store.invalidate(session, route.routeId, 'requirements_changed');
            } else throw failure(400, 'REVIEW_DECISION', 'Choose approve or reject.');
            return { route: routeFor(session, route.routeId), candidates: session.candidates[route.routeId], packages: Object.values(session.packages) };
          }); return json(res, 200, result);
        }
      }
      if (req.method === 'POST' && url.pathname === '/api/analyze') {
        const input = await body(req), session = store.get(input.sessionId);
        if (typeof input.idempotencyKey !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,99}$/.test(input.idempotencyKey)) throw failure(400, 'IDEMPOTENCY_KEY', 'A command key of 8–100 letters, digits or hyphens is required.');
        const operationId = `${session.id}:${input.idempotencyKey}`, commandHash = fingerprint(input);
        const prior = Object.hasOwn(session.commands, input.idempotencyKey) ? session.commands[input.idempotencyKey] : null;
        if (prior) { if (prior.hash !== commandHash) throw failure(409, 'IDEMPOTENCY_CONFLICT', 'Command key was used with different input.'); return json(res, 200, prior.result); }
        const pending = pendingAnalyses.get(operationId);
        if (pending) { if (pending.hash !== commandHash) throw failure(409, 'IDEMPOTENCY_CONFLICT', 'Command is already running with different input.'); return json(res, 200, await pending.promise); }
        const run = async () => {
        if (input.baseInputRevision !== session.inputRevision) throw failure(409, 'INPUT_REVISION_CONFLICT', 'Profile or evidence changed in another window. Reload the session.');
        if (input.requirementsByRoute) throw failure(400, 'SERVER_REQUIREMENTS', 'Route requirements are loaded by the server, not supplied by the browser.');
        const profile = input.profile || session.profile, evidence = input.evidence || session.evidence;
        syntheticInput(profile, evidence);
        const routeIds = input.routeIds || session.requirementsByRoute.map(route => route.routeId);
        if (!Array.isArray(routeIds) || !routeIds.length || new Set(routeIds).size !== routeIds.length) throw failure(400, 'ROUTES_INVALID', 'Select distinct known routes.');
        const routes = routeIds.map(id => routeFor(session, id));
        const capture = fingerprint({ routes, inputRevision: session.inputRevision, packages: session.packages });
        let proposals, mode = 'fixture';
        if (env.NEBIUS_API_KEY) {
          const requirements = routes.flatMap(route => route.requirements.map(r => ({ ...r, routeId: route.routeId, source_id: r.sourceId, source: route.sources.find(source => source.id === r.sourceId) })));
          const candidate = await infer({ profile, evidence, requirements, apiKey: env.NEBIUS_API_KEY, model: env.NEBIUS_MODEL });
          const routeById = new Map(requirements.map(r => [r.id, r.routeId]));
          proposals = candidate.items.map(item => ({ ...item, routeId: routeById.get(item.requirementId) })); mode = 'live-model';
        }
        if (store.get(session.id) !== session || capture !== fingerprint({ routes: routeIds.map(id => routeFor(session, id)), inputRevision: session.inputRevision, packages: session.packages })) throw failure(409, 'ANALYSIS_CONFLICT', 'Inputs changed during analysis. Try again.');
        const result = store.command(session, input.idempotencyKey, input, () => {
          const hash = fingerprint({ profile, evidence });
          if (session.inputHash !== hash) { session.inputRevision++; store.invalidate(session, null, 'inputs_changed'); }
          session.profile = structuredClone(profile); session.evidence = structuredClone(evidence); session.inputHash = hash;
          const built = buildPackages({ profile, evidence, requirementsByRoute: routes, proposals });
          const packages = built.packages.map(pkg => {
            const previous = Object.values(session.packages).find(item => item.routeId === pkg.routeId), revision = previous ? previous.revision + 1 : 1;
            let rebuilt = pkg;
            for (const request of previous?.followUps || (previous?.followUp ? [previous.followUp] : [])) rebuilt = applyFollowUp({ packageSnapshot: rebuilt, followUp: request, newEvidence: evidence, profile });
            return store.put(session, { ...rebuilt, id: previous?.id || randomUUID(), revision, version: revision, state: 'draft', evidence: structuredClone(evidence), sources: structuredClone(routeFor(session, pkg.routeId).sources), requirementsVersion: routeFor(session, pkg.routeId).requirementsVersion, inputRevision: session.inputRevision, createdAt: new Date().toISOString(), analysisMode: mode }, 'analyzed');
          });
          return { packages, inputRevision: session.inputRevision, warnings: built.warnings, mode, sourcesMode: session.mode === 'synthetic' ? 'synthetic' : 'reviewed-research' };
        }); return result;
        };
        const promise = run(); pendingAnalyses.set(operationId, { hash: commandHash, promise });
        try { return json(res, 200, await promise); } finally { pendingAnalyses.delete(operationId); }
      }
      if (req.method === 'POST' && url.pathname === '/api/follow-up') {
        const input = await body(req), session = store.get(input.sessionId);
        if (!Number.isInteger(input.baseRevision)) throw failure(400, 'REVISION_REQUIRED', 'Specify the reviewed package revision.');
        if (input.packageSnapshot) throw failure(400, 'SERVER_SNAPSHOT', 'Send a package ID and revision, not a snapshot.');
        const result = store.command(session, input.idempotencyKey, input, () => {
          const snapshot = freshPackage(session, store, input.packageId, input.baseRevision);
          if (!input.followUp || typeof input.followUp.id !== 'string' || typeof input.followUp.text !== 'string' || !input.followUp.text.trim() || input.followUp.text.length > 2000) throw failure(400, 'FOLLOWUP_INVALID', 'Enter a short synthetic follow-up request.');
          if (input.followUp.routeId !== snapshot.routeId) throw failure(400, 'FOLLOWUP_SCOPE', 'Follow-up belongs to another route.');
          const evidence = input.newEvidence || []; syntheticInput(session.profile, evidence);
          if (input.followUp.requestedItems !== undefined) {
            const items = input.followUp.requestedItems;
            if (input.followUp.humanReviewed !== true || !Array.isArray(items) || !items.length || items.length > 5 || new Set(items.map(item => item?.id)).size !== items.length || items.some(item => !item || typeof item.id !== 'string' || !/^[\w:-]{1,50}$/.test(item.id) || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 300 || typeof item.evidenceType !== 'string' || !/^[a-z_]{1,60}$/.test(item.evidenceType) || typeof item.subject !== 'string' || !item.subject.trim() || item.subject.length > 100)) throw failure(400, 'REQUEST_SCOPE_INVALID', 'Explicitly review 1–5 request items with evidence type and subject.');
          }
          const known = input.followUp.id === session.followUp.id && input.followUp.routeId === session.followUp.routeId && input.followUp.text === session.followUp.text;
          const followUp = { ...input.followUp, evidenceKind: known ? (session.followUp.evidenceKind || 'ownership_chart') : '__manual_review_required__', subject: 'company', requestedItem: input.followUp.text };
          const next = applyFollowUp({ packageSnapshot: snapshot, followUp, newEvidence: evidence, profile: session.profile });
          next.revision = snapshot.revision + 1; next.version = next.revision; next.state = 'draft';
          next.attachedEvidence = structuredClone(evidence); next.evidence = [...new Map([...(snapshot.evidence || []), ...evidence].map(item => [item.id, item])).values()];
          const scoped = next.items.filter(item => String(item.requirementId).startsWith(`follow-up:${followUp.id}`));
          const proposedResponse = input.followUp.humanReviewed === true ? `Reviewed request: ${scoped.filter(item => item.status === 'ready').length}/${scoped.length} items supported. Review attached evidence and unresolved items before replying.` : known ? (next.items.at(-1)?.status === 'ready' ? 'The requested ownership chart is attached for your review.' : 'Please add supporting evidence before replying.') : 'This request needs a person to identify and verify the required evidence before replying.';
          next.followUp.proposedResponse = proposedResponse;
          store.put(session, next, 'follow_up'); return { packageSnapshot: next, proposedResponse };
        }); return json(res, 200, result);
      }
      if (req.method === 'POST' && url.pathname === '/api/approve') {
        const input = await body(req), session = store.get(input.sessionId);
        if (!Number.isInteger(input.baseRevision)) throw failure(400, 'REVISION_REQUIRED', 'Specify the reviewed package revision.');
        if (input.packageSnapshot) throw failure(400, 'SERVER_SNAPSHOT', 'Send a package ID and revision, not a snapshot.');
        const result = store.command(session, input.idempotencyKey, input, () => {
          const snapshot = freshPackage(session, store, input.packageId, input.baseRevision);
          if (snapshot.status !== 'ready') throw failure(409, 'UNRESOLVED_ITEMS', 'Resolve missing and uncertain items before approval.');
          if (snapshot.approval) throw failure(409, 'ALREADY_APPROVED', 'This package is already approved.');
          if (input.response !== undefined && (typeof input.response !== 'string' || input.response.length > 3000)) throw failure(400, 'RESPONSE_INVALID', 'Response must be short synthetic text.');
          const next = approvePackage(snapshot, { actor: 'demo-session-visitor', approvedAt: new Date().toISOString(), response: input.response });
          next.state = 'approved'; next.revision = snapshot.revision + 1; next.version = next.revision;
          next.approval.version = next.revision; next.approval.reviewedRevision = snapshot.revision; next.approval.snapshotHash = fingerprint(snapshot);
          store.put(session, next, 'approved'); return { packageSnapshot: next };
        }); return json(res, 200, result);
      }
      if (req.method === 'POST' && url.pathname === '/api/sources/refresh') {
        const input = await body(req), session = store.get(input.sessionId), route = routeFor(session, input.routeId);
        const version = route.requirementsVersion;
        let result, mode = 'live-tavily';
        if (!env.TAVILY_API_KEY) { result = { sources: route.sources, errors: [{ code: 'MISSING_KEY', message: 'Live search not configured; saved dated sources shown.' }] }; mode = 'saved-fallback'; }
        else {
          try { result = await search({ query: route.searchQuery || `${route.bank} ${route.routeName} Portugal documents official`, officialDomains: route.officialDomains, apiKey: env.TAVILY_API_KEY }); }
          catch { result = { sources: route.sources, errors: [{ code: 'SEARCH_UNAVAILABLE', message: 'Live search failed; saved dated sources shown.' }] }; mode = 'saved-fallback'; }
        }
        if (routeFor(session, route.routeId).requirementsVersion !== version) throw failure(409, 'SOURCE_VERSION_CONFLICT', 'Sources changed during refresh. Try again.');
        const candidates = sourceCandidates(route, result.sources, mode);
        store.mutate(session, () => { session.candidates[route.routeId] = candidates; });
        return json(res, 200, { sources: candidates.map(item => item.source), candidates, errors: result.errors, mode });
      }
      const packageMatch = url.pathname.match(/^\/api\/packages\/([^/]+)(\/(?:export|print|history))?$/);
      if (packageMatch && req.method === 'GET') {
        const session = store.get(url.searchParams.get('sessionId'));
        const pkg = packageMatch[2] && packageMatch[2] !== '/history' ? freshPackage(session, store, packageMatch[1]) : store.package(session, packageMatch[1]);
        if (packageMatch[2] === '/history') return json(res, 200, { snapshots: Object.values(session.snapshots).filter(snapshot => snapshot.id === pkg.id).sort((a,b)=>a.revision-b.revision) });
        const snapshot = packageResponse(session, pkg);
        if (packageMatch[2] === '/print') {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(printablePackage({ profile: session.profile, packageSnapshot: snapshot, route: routeFor(session, pkg.routeId) }));
        }
        if (!packageMatch[2]) return json(res, 200, { packageSnapshot: snapshot });
        res.setHeader('content-disposition', `attachment; filename="banking-${pkg.state}-${pkg.routeId.replace(/[^\w-]/g, '-')}.json"`);
        return json(res, 200, { product: 'Business Banking Navigator', synthetic: true, exportKind: pkg.state === 'approved' ? 'approved-package' : 'draft-checklist', exportedAt: new Date().toISOString(), packageSnapshot: snapshot, disclaimer: 'Synthetic company. Published requirements are route-scoped research, not bank acceptance. No application was sent.' });
      }
      if (req.method !== 'GET' || url.pathname.startsWith('/api/')) throw failure(404, 'NOT_FOUND', 'Not found.');
      const path = resolve(join(publicDir, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1)));
      if (!path.startsWith(publicDir + sep)) throw failure(404, 'NOT_FOUND', 'Not found.');
      const data = await readFile(path); res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(data);
    } catch (error) {
      const status = error.status || (error.code === 'ENOENT' ? 404 : 502);
      json(res, status, { error: status >= 500 ? 'Service unavailable. Previous approved results were not changed.' : error.message, code: error.status ? error.code : 'SERVICE_UNAVAILABLE', requestId });
    }
  });
  server.requestTimeout = 30_000; server.headersTimeout = 15_000;
  return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 3000);
  createAppServer({ log: event => process.stdout.write(JSON.stringify(event) + '\n') }).listen(port, process.env.HOST || undefined, () => process.stdout.write(`Business Banking Navigator listening on http://localhost:${port}\n`));
}
