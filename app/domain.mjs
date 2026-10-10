const STATUSES = new Set(['ready', 'missing', 'uncertain', 'not_applicable']);

function array(value) { return Array.isArray(value) ? value : []; }
function clone(value) { return structuredClone(value); }
function id(value) { return value == null ? undefined : String(value); }
export function identityConflict(evidence, profile) {
  const fields = evidence?.fields;
  if (!fields || evidence.subject !== 'company') return false;
  const addressFact = profile?.facts?.address;
  const address = addressFact && typeof addressFact === 'object' && 'value' in addressFact ? addressFact.value : addressFact;
  return Boolean((fields.name && profile?.name && fields.name !== profile.name) ||
    (fields.registrationNumber && profile?.registrationNumber && fields.registrationNumber !== profile.registrationNumber) ||
    (fields.address && address && fields.address !== address));
}
function evidenceMatches(evidence, requirement) {
  if (typeof evidence.id !== 'string' || !evidence.id) return false;
  const kinds = array(requirement.evidenceKinds).length ? requirement.evidenceKinds : [requirement.evidenceType ?? requirement.evidenceKind ?? requirement.evidence_kind].filter(Boolean);
  if (!kinds.includes(evidence.type ?? evidence.kind)) return false;
  if (evidence.valid === false || evidence.expired === true || evidence.verified === false || evidence.conflict === true) return false;
  if (requirement.subject && evidence.subject !== requirement.subject) return false;
  if (requirement.subjectId && evidence.subjectId !== requirement.subjectId) return false;
  if (requirement.entityId && evidence.entityId !== requirement.entityId) return false;
  if (evidence.validUntil && (!Number.isFinite(Date.parse(evidence.validUntil)) || Date.parse(evidence.validUntil) < Date.now())) return false;
  return true;
}

export function requirementApplicability(requirement, profile) {
  const condition = requirement.condition;
  if (!condition) return 'yes';
  if (condition.applicable === true || condition.status === 'applicable') return 'yes';
  if (condition.applicable === false || condition.status === 'not_applicable') {
    return condition.factId && profile?.facts?.[condition.factId]?.verified === true ? 'no' : 'unknown';
  }
  if (condition.field) {
    const fact = profile?.facts?.[condition.field];
    const value = fact && typeof fact === 'object' && 'value' in fact ? fact.value : fact;
    if (value == null || value === '') return 'unknown';
    if (condition.equals !== undefined) return value === condition.equals ? 'yes' : fact?.verified === true ? 'no' : 'unknown';
  }
  return 'unknown';
}

function normalizeRequirement(raw, routeId) {
  return {
    ...raw,
    id: id(raw.id ?? raw.requirementId),
    sourceId: id(raw.sourceId ?? raw.source_id),
    routeId: id(raw.routeId ?? raw.route_id ?? routeId),
  };
}

function proposalFor(proposals, routeId, requirementId) {
  return array(proposals).find(p => id(p.routeId) === routeId && id(p.requirementId) === requirementId);
}

export function evaluateRouteEligibility(route, profile = {}) {
  const rules = array(route?.eligibilityRules);
  if (!rules.length) return { status: 'check_directly', rationale: route.eligibilityNote || 'Published route eligibility is not established', sourceIds: [] };
  const knownSourceIds = new Set(array(route.sources).map(source => id(source.id)));
  if (rules.some(rule => !rule.sourceId || !knownSourceIds.has(id(rule.sourceId)))) return { status: 'check_directly', rationale: 'Route eligibility source needs review', sourceIds: [] };
  const sourceById = new Map(array(route.sources).map(source => [id(source.id), source]));
  if (rules.some(rule => sourceById.get(id(rule.sourceId))?.stale || sourceById.get(id(rule.sourceId))?.unavailable)) {
    return { status: 'check_directly', rationale: 'Published route eligibility source is stale or unavailable', sourceIds: [...new Set(rules.map(rule => id(rule.sourceId)))] };
  }
  const participants = [...new Map([...array(profile.representatives), ...array(profile.owners)].map((person, index) => [person.id ?? person.name ?? index, person])).values()];
  let unknown = false;
  const failed = [];
  for (const rule of rules) {
    let result;
    if (rule.kind === 'all_participants_nationality') {
      result = participants.length && participants.every(p => p.nationality) ? participants.every(p => p.nationality === rule.equals) : undefined;
    } else if (rule.kind === 'all_participants_residence') {
      result = participants.length && participants.every(p => p.residenceCountry) ? participants.every(p => p.residenceCountry === rule.equals) : undefined;
    } else if (rule.kind === 'maximum_participants') {
      result = participants.length ? participants.length <= rule.maximum : undefined;
    } else if (rule.kind === 'company_country') {
      result = profile.country ? profile.country === rule.equals : undefined;
    }
    if (result === undefined) unknown = true;
    else if (!result) failed.push(rule);
  }
  if (failed.length) return { status: 'not_supported_by_published_route', rationale: 'Profile does not meet a published condition for this route; ask the bank about other channels', sourceIds: [...new Set(failed.map(r => r.sourceId))] };
  if (unknown) return { status: 'check_directly', rationale: 'Information needed to confirm this published route is missing', sourceIds: [...new Set(rules.map(r => r.sourceId))] };
  return { status: 'possible', rationale: 'Known published route conditions appear met; bank decides', sourceIds: [...new Set(rules.map(r => r.sourceId))] };
}

/** Build source-scoped packages. Untrusted proposals can select evidence, never introduce rules. */
export function buildPackages({ profile = {}, evidence = [], requirementsByRoute = [], proposals = [] } = {}) {
  const evidenceById = new Map(array(evidence).map(e => [id(e.id), e]));
  const packages = [], warnings = [];
  const routes = Array.isArray(requirementsByRoute) ? requirementsByRoute.map(route => [id(route.routeId), route]) : Object.entries(requirementsByRoute);
  for (const [routeId, routeInput] of routes) {
    const requirements = Array.isArray(routeInput) ? routeInput : array(routeInput?.requirements);
    const sources = Array.isArray(routeInput) ? undefined : routeInput?.sources;
    const sourceIds = sources ? new Set(array(sources).map(s => id(s.id))) : null;
    const sourceById = new Map(array(sources).map(s => [id(s.id), s]));
    const items = [];
    const seen = new Set();
    for (const raw of requirements) {
      const requirement = normalizeRequirement(raw, routeId);
      if (!requirement.id || seen.has(requirement.id)) {
        warnings.push(`Duplicate or missing requirement ID in ${routeId}`);
        items.push({ requirementId: requirement.id ?? `unknown:${items.length}`, sourceId: requirement.sourceId ?? null, evidenceIds: [], status: 'uncertain', rationale: 'Duplicate or missing requirement ID needs review' });
        continue;
      }
      seen.add(requirement.id);
      if (requirement.routeId !== routeId || !requirement.sourceId || (sourceIds && !sourceIds.has(requirement.sourceId))) {
        warnings.push(`Unsupported source or route for ${requirement.id} in ${routeId}`);
        items.push({ requirementId: requirement.id, sourceId: requirement.sourceId ?? null, evidenceIds: [], status: 'uncertain', rationale: 'Requirement source or route needs review' });
        continue;
      }
      const proposal = proposalFor(proposals, routeId, requirement.id);
      if (proposal && (id(proposal.sourceId) !== requirement.sourceId || !STATUSES.has(proposal.status))) {
        warnings.push(`Rejected proposal for ${routeId}/${requirement.id}: source or status mismatch`);
      }
      const candidates = proposal && id(proposal.sourceId) === requirement.sourceId && STATUSES.has(proposal.status)
        ? array(proposal.evidenceIds).map(eid => evidenceById.get(id(eid))).filter(Boolean)
        : array(evidence);
      const groups = array(requirement.evidenceGroups).length ? requirement.evidenceGroups : [{ id: requirement.id, evidenceKinds: array(requirement.evidenceKinds).length ? requirement.evidenceKinds : [requirement.evidenceType ?? requirement.evidenceKind ?? requirement.evidence_kind].filter(Boolean), subject: requirement.subject, subjectId: requirement.subjectId, entityId: requirement.entityId }];
      const possible = groups.flatMap(group => array(evidence).filter(e => array(group.evidenceKinds).includes(e.type ?? e.kind) && (!group.subject || e.subject === group.subject)));
      const matchesByGroup = groups.map(group => candidates.filter(e => evidenceMatches(e, group) && !identityConflict(e, profile)));
      const matched = [...new Map(matchesByGroup.flat().map(e => [id(e.id), e])).values()];
      const allGroupsMet = matchesByGroup.every(matches => matches.length > 0);
      const condition = requirementApplicability(requirement, profile);
      let status = 'missing', rationale = 'No matching verified evidence';
      if (condition === 'unknown' || requirement.conditional && !requirement.condition) { status = 'uncertain'; rationale = 'Applicability must be confirmed'; }
      else if (condition === 'no') { status = 'not_applicable'; rationale = 'Verified condition excludes this requirement'; }
      else if (requirement.conflict || requirement.stale || requirement.sourceStatus === 'stale' || sourceById.get(requirement.sourceId)?.stale || sourceById.get(requirement.sourceId)?.unavailable) { status = 'uncertain'; rationale = 'Requirement source needs review'; }
      else if (possible.some(e => identityConflict(e, profile))) { status = 'uncertain'; rationale = 'Evidence conflicts with company profile'; }
      else if (proposal && id(proposal.sourceId) === requirement.sourceId && proposal.status === 'uncertain') { status = 'uncertain'; rationale = 'Model identified uncertainty requiring review'; }
      else if (allGroupsMet && matched.length) { status = 'ready'; rationale = 'Matched evidence for every required group'; }
      else if (matched.length) { status = 'missing'; rationale = 'Evidence missing for one or more required groups'; }
      const evidenceIds = condition === 'yes' ? matched.map(e => id(e.id)) : [];
      const source = array(sources).find(s => id(s.id) === requirement.sourceId);
      items.push({ requirementId: requirement.id, sourceId: requirement.sourceId, evidenceIds, status, rationale, sourceUrl: source?.url, sourceExcerpt: source?.excerpt, sourceRetrievedAt: source?.retrievedAt });
    }
    for (const p of array(proposals).filter(p => id(p.routeId) === routeId)) {
      if (!seen.has(id(p.requirementId))) warnings.push(`Rejected invented requirement ${p.requirementId} in ${routeId}`);
    }
    const routeEligibility = evaluateRouteEligibility(routeInput, profile);
    packages.push({ routeId, bank: routeInput?.bank, routeName: routeInput?.routeName, items, status: routeEligibility.status !== 'not_supported_by_published_route' && items.length > 0 && items.every(i => i.status === 'ready' || i.status === 'not_applicable') ? 'ready' : 'needs_review', routeEligibility, version: 1, approvedAt: null, approval: null, history: [] });
  }
  return { packages, warnings };
}

/** Follow-ups are specific to one route, and create a new, unapproved snapshot. */
export function applyFollowUp({ packageSnapshot, followUp, newEvidence = [], profile, approval } = {}) {
  if (!packageSnapshot?.routeId || !followUp) throw new TypeError('Package and follow-up required');
  if (id(followUp.routeId ?? followUp.bank) !== id(packageSnapshot.routeId)) throw new Error('Follow-up route mismatch');
  const old = clone(packageSnapshot);
  const next = clone(packageSnapshot);
  next.version = (Number(old.version) || 1) + 1;
  next.approval = null;
  next.approvedAt = null;
  next.history = [...array(old.history), { version: old.version ?? 1, items: old.items, approval: old.approval ?? null }];
  next.items = array(old.items);
  const requirementIds = array(followUp.relatedRequirementIds);
  const followUpId = id(followUp.id);
  if (!followUpId) throw new TypeError('Follow-up ID required');
  const profileOwners = array(profile?.owners).map(owner => owner.name).sort();
  const classified = followUp.humanReviewed === true && array(followUp.requestedItems).length > 0;
  const requests = classified ? followUp.requestedItems : [{ id: null, label: followUp.requestedItem ?? followUp.text, evidenceType: followUp.evidenceKind, subject: followUp.subject }];
  const newItems = requests.map(request => {
    const requirementId = request.id ? `follow-up:${followUpId}:${id(request.id)}` : `follow-up:${followUpId}`;
    const kind = request.evidenceType;
    const candidates = array(newEvidence).filter(e => kind && e.type === kind && (!request.subject || e.subject === request.subject));
    const matchedEvidence = candidates.filter(e => e.id && e.valid !== false && e.verified !== false && e.expired !== true && !e.conflict && (!e.validUntil || Number.isFinite(Date.parse(e.validUntil)) && Date.parse(e.validUntil) >= Date.now()) && (!kind.includes('ownership') || e.subject === 'company') && !identityConflict(e, profile));
    const ownerConflict = matchedEvidence.some(e => e.fields?.owners && profileOwners.length && JSON.stringify([...e.fields.owners].sort()) !== JSON.stringify(profileOwners));
    const conflict = ownerConflict || candidates.some(e => identityConflict(e, profile) || e.conflict);
    return {
      requirementId, sourceId: `follow-up:${followUpId}`,
      evidenceIds: conflict ? [] : matchedEvidence.map(e => id(e.id)),
      status: conflict ? 'uncertain' : matchedEvidence.length ? 'ready' : 'missing',
      rationale: conflict ? 'Evidence conflicts with company profile' : matchedEvidence.length ? 'Evidence supplied for bank follow-up' : 'Follow-up evidence missing or request not classified',
      origin: 'follow_up', relatedRequirementIds: requirementIds, label: request.label,
    };
  });
  const prior = newItems.map(item => array(old.items).find(existing => existing.requirementId === item.requirementId));
  const oldRequestItems = array(old.items).filter(item => item.sourceId === `follow-up:${followUpId}`);
  const previousRequest = array(old.followUps).find(request => id(request.id) === followUpId) || (id(old.followUp?.id) === followUpId ? old.followUp : null);
  if (oldRequestItems.length === newItems.length && prior.every(Boolean) && newItems.every((item, index) => item.label === prior[index].label && item.status === prior[index].status && JSON.stringify(item.evidenceIds) === JSON.stringify(prior[index].evidenceIds)) && previousRequest?.requestedItem === followUp.requestedItem) {
    const error = new Error('Duplicate follow-up without new evidence or changes');
    error.code = 'DUPLICATE_FOLLOWUP'; error.status = 409; throw error;
  }
  next.items = [...next.items.filter(item => item.sourceId !== `follow-up:${followUpId}`), ...newItems];
  next.status = next.routeEligibility?.status !== 'not_supported_by_published_route' && next.items.every(i => i.status === 'ready' || i.status === 'not_applicable') ? 'ready' : 'needs_review';
  next.followUp = { id: followUpId, routeId: next.routeId, text: followUp.text, requestedItem: followUp.requestedItem, evidenceKind: followUp.evidenceKind, subject: followUp.subject, requestedItems: classified ? clone(followUp.requestedItems) : [], humanReviewed: classified, proposedResponse: followUp.proposedResponse ?? '', approvedResponse: null };
  const previousRequests = array(old.followUps).length ? old.followUps : old.followUp ? [old.followUp] : [];
  next.followUps = [...previousRequests.filter(request => id(request.id) !== followUpId), clone(next.followUp)];
  // Approval of a previous version is never valid for this revision; a separate explicit action is required.
  if (approval) next.approvalRequired = true;
  return next;
}

export function approvePackage(packageSnapshot, { actor, approvedAt, response } = {}) {
  if (!actor || !approvedAt) throw new TypeError('Explicit actor and approval time required');
  if (packageSnapshot?.routeEligibility?.status === 'not_supported_by_published_route') throw new Error('Published route does not support this profile');
  if (packageSnapshot?.status !== 'ready') throw new Error('Package has unresolved requirements');
  const next = clone(packageSnapshot);
  next.approval = { actor, approvedAt, version: next.version };
  next.approvedAt = approvedAt;
  if (next.followUp) next.followUp.approvedResponse = response ?? next.followUp.proposedResponse;
  return next;
}
