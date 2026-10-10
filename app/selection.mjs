import {publishedOffers,OFFER_VERSION,usablePublishedSource,estimateTariffs} from './published-offers.mjs';
import {failure,fingerprint} from './store.mjs';
import {evaluateRouteEligibility} from './domain.mjs';
export const FEATURES={online:'Online opening',branch:'Opening at a branch',multi_currency:'Hold balances in several currencies',team_cards:'Cards for team members',local_payments:'Portuguese reference / tax payments'};
export const POLICY_VERSION='needs-v3-essential-coverage-2026-10-06';
export function validateNeeds(raw={},assess=false){
 if(!raw || typeof raw!=='object' || Array.isArray(raw) || JSON.stringify(raw).length>4000) throw failure(400,'NEEDS_INVALID','Use a small banking-needs object.');
 const legalForm=raw.legalForm || '';if(!['','Lda','SA','ENI'].includes(legalForm))throw failure(400,'NEEDS_INVALID','Select a listed legal form.');
 const currencies=raw.currencies ?? [];if(!Array.isArray(currencies)||currencies.length>10||currencies.some(c=>!['EUR','USD','GBP','CHF','CAD','AUD','JPY','PLN','SEK','NOK','DKK'].includes(c))||new Set(currencies).size!==currencies.length)throw failure(400,'NEEDS_INVALID','Use up to ten distinct supported currency codes.');
 const monthlyPayments=raw.monthlyPayments ?? null;if(monthlyPayments!==null&&(!Number.isInteger(monthlyPayments)||monthlyPayments<0||monthlyPayments>1000000))throw failure(400,'NEEDS_INVALID','Monthly payment count must be a whole number from 0 to 1,000,000, or unknown.');
 const monthlySepaPayments=raw.monthlySepaPayments ?? null;if(monthlySepaPayments!==null&&(!Number.isInteger(monthlySepaPayments)||monthlySepaPayments<0||monthlySepaPayments>1000000))throw failure(400,'NEEDS_INVALID','Monthly SEPA transfers and direct debits must be a whole number from 0 to 1,000,000, or unknown.');
 const priorities={};if(raw.priorities && (typeof raw.priorities!=='object'||Array.isArray(raw.priorities)))throw failure(400,'NEEDS_INVALID','Priorities must be an object.');
 for(const key of Object.keys(raw.priorities || {}))if(!Object.hasOwn(FEATURES,key))throw failure(400,'NEEDS_INVALID','Unknown banking need.');
 for(const key of Object.keys(FEATURES)){priorities[key]=raw.priorities?.[key] || 'irrelevant';if(!['mandatory','preference','irrelevant'].includes(priorities[key]))throw failure(400,'NEEDS_INVALID','Choose mandatory, preference or irrelevant.');}
 if(assess && (!legalForm || !Object.values(priorities).some(p=>p!=='irrelevant')))throw failure(400,'NEEDS_INCOMPLETE','Select a legal form and at least one mandatory need or preference.');
 return {legalForm,currencies,monthlyPayments,monthlySepaPayments,priorities};
}
const published=(value,source)=>({value,source});
export function publicSelectionCatalog(routes){
 return routes.map(route=>{
  const capabilities={};
  const source=route.sources.find(s=>!s.stale && !s.unavailable);
  if(source && route.channel==='online')capabilities.online=published(true,route.sources.find(s=>s.id.startsWith('QONTO-ONLINE')) || source);
  if(source && route.channel==='branch')capabilities.branch=published(true,source);
  const offer=publishedOffers[route.routeId] || {};
  return {routeId:route.routeId,capabilities:{...capabilities,...offer.capabilities},tariffs:offer.tariffs || []};
 });
}
export const decisionBaseline=session=>fingerprint({profile:session.profile,inputRevision:session.inputRevision,routes:session.requirementsByRoute,policy:POLICY_VERSION,offer:OFFER_VERSION,published:publicSelectionCatalog(session.requirementsByRoute).map(e=>({routeId:e.routeId,capabilities:e.capabilities,tariffs:e.tariffs,fresh:[...Object.values(e.capabilities),...e.tariffs].map(f=>usablePublishedSource(f.source))}))});
export function decisionView(session){const decision=session.decision;if(!decision)return null;return {...decision,stale:Boolean(decision.assessment && decision.assessment.baseline!==decisionBaseline(session))};}
export function assessOptions(session,needs,catalog=publicSelectionCatalog){
 const entries=catalog(session.requirementsByRoute), result={shortlist:[],clarify:[],excluded:[],policyVersion:POLICY_VERSION,baseline:decisionBaseline(session),assessedAt:new Date().toISOString(),costCompared:false,reviewsCompared:false};
 for(const entry of entries){
  const route=session.requirementsByRoute.find(r=>r.routeId===entry.routeId);if(!route)continue;
  const inScope=needs.legalForm==='Lda' && session.profile.country==='PT';
  const eligibility=inScope ? entry.eligibility || evaluateRouteEligibility(route,session.profile) : {status:'check_directly',rationale:'Legal form or company country is outside the reviewed PT Lda baseline.'};
  const row={routeId:route.routeId,bank:route.bank,channel:route.channel || 'unknown',eligibility,facts:[],questions:[],reasons:[],mandatoryMatches:0,preferenceMatches:0};let excluded=eligibility.status==='not_supported_by_published_route', unknown=eligibility.status!=='possible';
  if(!inScope){unknown=true;row.questions.push('This first evidence baseline covers Lda; confirm this legal form directly.');}
  if(unknown)row.questions.push(eligibility.rationale);
  if(excluded)row.reasons.push(eligibility.rationale);
  for(const [key,priority] of Object.entries(needs.priorities)){
   if(priority==='irrelevant')continue;
   const raw=entry.capabilities[key], source=raw?.source;
   const usable=inScope && usablePublishedSource(source) && !raw.conflict && !raw.stale;
   const value=usable && typeof raw.value==='boolean' ? raw.value : 'unknown';
   row.facts.push({key,label:FEATURES[key],priority,value,source:source || null});
   if(priority==='mandatory' && value===false){excluded=true;row.reasons.push(`${FEATURES[key]}: published as unsupported for this route.`);}
   if(value==='unknown'){row.questions.push(`Confirm ${FEATURES[key].toLowerCase()} for this product and company.`);if(priority==='mandatory')unknown=true;}
   if(value===true){row.reasons.push(`${FEATURES[key]}: supported by the cited route source.`);if(priority==='preference')row.preferenceMatches++;if(priority==='mandatory')row.mandatoryMatches++;}
  }
  if(needs.currencies.length>1)row.questions.push('Multiple currency usage recorded; holding balances and sending transfers differ. Confirm currencies with the provider.');
  row.tariffs=inScope ? estimateTariffs(entry.tariffs,needs.monthlySepaPayments ?? null) : [];
  row.nextAction=excluded ? 'Check another opening channel or revise the mandatory need.' : row.questions.length ? 'Confirm the listed questions with the provider before applying.' : 'Review the opening requirements before preparing documents.';
  result[excluded?'excluded':unknown?'clarify':'shortlist'].push(row);
 }
 // Confirmed essential coverage sorts first, then confirmed preferences; exact equal coverage is a tie. Bank name only orders ties.
 for(const list of [result.shortlist,result.clarify]){list.sort((a,b)=>b.mandatoryMatches-a.mandatoryMatches || b.preferenceMatches-a.preferenceMatches || a.bank.localeCompare(b.bank));for(const row of list)row.tied=list.filter(r=>r.mandatoryMatches===row.mandatoryMatches && r.preferenceMatches===row.preferenceMatches).length>1;}
 result.otherCandidates=result.shortlist.slice(3);result.shortlist=result.shortlist.slice(0,3);
 return result;
}
