import { randomUUID } from 'node:crypto';
import { failure, fingerprint } from './store.mjs';

export function sourceCandidates(route, sources, mode) {
  return sources.slice(0, 10).map(raw => {
    let hostname = '', protocol = '';
    try { const url = new URL(raw.url); hostname = url.hostname; protocol = url.protocol; } catch { /* rejected below */ }
    const allowed = route.officialDomains || (route.sources || []).map(source => { try { return new URL(source.url).hostname; } catch { return ''; } });
    const official = protocol === 'https:' && allowed.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    const text = String(raw.content || raw.excerpt || '').slice(0, 30_000);
    const contentHash = fingerprint(text);
    const source = { id: mode === 'saved-fallback' ? raw.id : `${raw.id || 'source'}:${contentHash.slice(0, 12)}`, url: raw.url, title: String(raw.title || route.bank), excerpt: String(raw.excerpt || text).slice(0, 1800), content: text, contentHash, retrievedAt: raw.retrievedAt, kind: raw.kind || 'public_candidate', provenance: raw.provenance || {}, routeId: route.routeId };
    const prior = (route.sources || []).filter(item => item.url === source.url);
    const old = prior.findLast(item => !item.stale) || prior.at(-1);
    const reasons = [];
    if (!official) reasons.push('Not an allowed official domain for this route.');
    if (!text.trim()) reasons.push('No usable source text.');
    if (!source.retrievedAt || !Number.isFinite(Date.parse(source.retrievedAt))) reasons.push('Missing retrieval date.');
    if (mode !== 'saved-fallback' && source.provenance.extract === false) reasons.push('Only a search snippet was returned; extraction must be retried.');
    return { id: randomUUID(), source, status: 'pending', eligible: reasons.length === 0, reasons, changed: Boolean(old) && (old.contentHash || fingerprint(String(old.content || old.excerpt || ''))) !== source.contentHash, previousSource: old || null, mode, scopeWarning: 'Confirm product, channel, jurisdiction and conditions before approving.' };
  });
}

export function reviewedRoute(route, candidate, requirements) {
  if (route.sources.length >= 30) throw failure(429, 'SOURCE_LIMIT', 'Source history limit reached. Start a new demo session.');
  if (!candidate?.eligible || candidate.status !== 'pending') throw failure(409, 'SOURCE_NOT_REVIEWABLE', 'Source must be an eligible pending candidate.');
  if (!Array.isArray(requirements) || !requirements.length || requirements.length > 50) throw failure(400, 'REQUIREMENTS_INVALID', 'Review 1–50 requirement lines.');
  const sourceIds = new Set([...route.sources.map(source => source.id), candidate.source.id]);
  const seen = new Set();
  for (const requirement of requirements) {
    if (!requirement || typeof requirement.id !== 'string' || seen.has(requirement.id) || !/^[\w:-]{1,80}$/.test(requirement.id)) throw failure(400, 'REQUIREMENTS_INVALID', 'Requirement IDs must be unique and stable.');
    seen.add(requirement.id);
    if (!sourceIds.has(requirement.sourceId) || (requirement.routeId && requirement.routeId !== route.routeId)) throw failure(400, 'SOURCE_SCOPE', 'Requirement source must belong to the selected route.');
    if (typeof requirement.label !== 'string' || !requirement.label.trim() || requirement.label.length > 500) throw failure(400, 'REQUIREMENTS_INVALID', 'Each requirement needs a short label.');
    if (!requirement.evidenceType && !requirement.evidenceKinds?.length && !requirement.evidenceGroups?.length) throw failure(400, 'REQUIREMENTS_INVALID', 'Each requirement needs evidence types or required groups.');
    if (requirement.evidenceGroups !== undefined) {
      const groups = requirement.evidenceGroups;
      if (!Array.isArray(groups) || !groups.length || groups.length > 5 || new Set(groups.map(group=>group?.id)).size !== groups.length || groups.some(group=>!group || typeof group.id !== 'string' || !/^[\w:-]{1,50}$/.test(group.id) || !Array.isArray(group.evidenceKinds) || !group.evidenceKinds.length || group.evidenceKinds.length > 5 || group.evidenceKinds.some(kind=>typeof kind !== 'string' || !/^[a-z_]{1,60}$/.test(kind)))) throw failure(400, 'REQUIREMENTS_INVALID', 'Review 1–5 distinct evidence groups with valid types.');
    }
    if (requirement.condition && (typeof requirement.condition !== 'object' || Array.isArray(requirement.condition))) throw failure(400, 'REQUIREMENTS_INVALID', 'Condition must be an object.');
  }
  if (!requirements.some(requirement => requirement.sourceId === candidate.source.id)) throw failure(400, 'SOURCE_UNUSED', 'At least one reviewed requirement must cite this candidate source ID.');
  const source = { ...candidate.source, kind: 'reviewed_public', reviewedAt: new Date().toISOString(), reviewer: 'demo-session-visitor' };
  const sources = route.sources.filter(item => item.id !== source.id).map(item => candidate.changed && item.url === source.url ? { ...item, stale: true } : item).concat(source);
  return { ...route, requirementsVersion: route.requirementsVersion + 1, sources, requirements: structuredClone(requirements) };
}
