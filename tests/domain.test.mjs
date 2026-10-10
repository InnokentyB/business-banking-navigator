import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPackages, applyFollowUp, approvePackage, evaluateRouteEligibility } from '../app/domain.mjs';
import { researchFixture, researchData } from '../app/research-data.mjs';

const profile = { id: 'C1', facts: { nationality: { value: 'PT', verified: true } } };
const evidence = [
  { id: 'E1', type: 'registration', subject: 'company' },
  { id: 'E2', type: 'id', subject: 'Sofia' },
  { id: 'E3', type: 'activity', subject: 'company' },
];
const routes = [
  { routeId: 'A', bank: 'Alpha', routeName: 'online', sources: [{ id: 'SA' }], requirements: [
    { id: 'A1', sourceId: 'SA', evidenceType: 'registration', subject: 'company' },
    { id: 'A2', sourceId: 'SA', evidenceType: 'address', subject: 'company' },
  ] },
  { routeId: 'B', bank: 'Beta', routeName: 'branch', sources: [{ id: 'SB' }], requirements: [
    { id: 'B1', sourceId: 'SB', evidenceType: 'registration', subject: 'company' },
    { id: 'B2', sourceId: 'SB', evidenceType: 'activity', subject: 'company' },
  ] },
];

test('two route packages reuse matching evidence but remain source scoped', () => {
  const { packages, warnings } = buildPackages({ profile, evidence, requirementsByRoute: routes });
  assert.deepEqual(warnings, []);
  assert.equal(packages[0].status, 'needs_review');
  assert.equal(packages[1].status, 'ready');
  assert.deepEqual(packages[0].items.map(i => i.status), ['ready', 'missing']);
  assert.deepEqual(packages[1].items.map(i => i.sourceId), ['SB', 'SB']);
  assert.deepEqual(packages[0].items[0].evidenceIds, ['E1']);
  assert.deepEqual(packages[1].items[0].evidenceIds, ['E1']);
});

test('unsupported model rules and cross route sources never enter packages', () => {
  const copy = structuredClone(routes);
  copy[0].requirements.push({ id: 'INVALID', sourceId: 'SB', evidenceType: 'id' });
  const { packages, warnings } = buildPackages({ profile, evidence, requirementsByRoute: copy, proposals: [
    { routeId: 'A', requirementId: 'INVENTED', sourceId: 'SA', evidenceIds: ['E2'], status: 'ready' },
    { routeId: 'A', requirementId: 'A2', sourceId: 'SB', evidenceIds: ['E2'], status: 'ready' },
  ] });
  assert.deepEqual(packages[0].items.map(i => i.requirementId), ['A1', 'A2', 'INVALID']);
  assert.equal(packages[0].items[1].status, 'missing');
  assert.equal(packages[0].items[2].status, 'uncertain');
  assert.equal(warnings.length, 3);
});

test('TC-41 an unsupported published requirement cannot silently disappear', () => {
  const copy = structuredClone(routes);
  copy[1].requirements.push({ id: 'B3', sourceId: 'missing-source', evidenceType: 'id' });
  const result = buildPackages({ profile, evidence, requirementsByRoute: [copy[1]] });
  assert.equal(result.packages[0].status, 'needs_review');
  assert.equal(result.packages[0].items.length, 3);
  assert.equal(result.packages[0].items[2].status, 'uncertain');
});

test('TC-35 stale or unavailable source makes matched evidence uncertain', () => {
  for (const flag of ['stale', 'unavailable']) {
    const copy = structuredClone(routes[1]);
    copy.sources[0][flag] = true;
    const result = buildPackages({ profile, evidence, requirementsByRoute: [copy] });
    assert.deepEqual(result.packages[0].items.map(i => i.status), ['uncertain', 'uncertain']);
  }
});

test('TC-41 duplicate requirement ID remains visible and prevents complete package', () => {
  const copy = structuredClone(routes[1]);
  copy.requirements.push({ id: 'B1', sourceId: 'SB', evidenceType: 'registration' });
  const result = buildPackages({ profile, evidence, requirementsByRoute: [copy] });
  assert.equal(result.packages[0].items.length, 3);
  assert.equal(result.packages[0].status, 'needs_review');
  assert.equal(result.packages[0].items[2].status, 'uncertain');
});

test('TC-42 unverified fact cannot exclude a requirement', () => {
  const copy = structuredClone(routes[1]);
  copy.requirements = [{ id: 'B1', sourceId: 'SB', evidenceType: 'registration', condition: { field: 'nationality', equals: 'ES' } }];
  const unverified = { facts: { nationality: { value: 'PT', verified: false } } };
  assert.equal(buildPackages({ profile: unverified, evidence, requirementsByRoute: [copy] }).packages[0].items[0].status, 'uncertain');
});

test('TC-38 malformed expiry date never counts as valid evidence', () => {
  const copy = structuredClone(routes[1]);
  const invalidEvidence = [{ id: 'E1', type: 'registration', subject: 'company', validUntil: 'not-a-date' }];
  assert.equal(buildPackages({ profile, evidence: invalidEvidence, requirementsByRoute: [copy] }).packages[0].items[0].status, 'missing');
});

test('person-specific and expired evidence cannot make a rule ready', () => {
  const oneRoute = [{ ...routes[0], requirements: [{ id: 'ID', sourceId: 'SA', evidenceType: 'id', subject: 'Alex' }, { id: 'REG', sourceId: 'SA', evidenceType: 'registration', subject: 'company' }] }];
  const result = buildPackages({ profile, evidence: [...evidence, { id: 'E4', type: 'registration', subject: 'company', validUntil: '2001-01-01' }].filter(e => e.id !== 'E1'), requirementsByRoute: oneRoute });
  assert.deepEqual(result.packages[0].items.map(i => i.status), ['missing', 'missing']);
});

test('unknown condition remains uncertain; verified exclusion is requirement scoped', () => {
  const conditional = [{ ...routes[0], requirements: [
    { id: 'C1', sourceId: 'SA', evidenceType: 'registration', condition: { field: 'unknown', equals: true } },
    { id: 'C2', sourceId: 'SA', evidenceType: 'registration', condition: { field: 'nationality', equals: 'ES' } },
  ] }];
  const items = buildPackages({ profile, evidence, requirementsByRoute: conditional }).packages[0].items;
  assert.equal(items[0].status, 'uncertain');
  assert.equal(items[1].status, 'not_applicable');
});

test('follow-up is route specific, immutable and invalidates approval', () => {
  const original = approvePackage(buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0], { actor: 'user', approvedAt: '2026-10-01T12:00:00Z' });
  assert.throws(() => applyFollowUp({ packageSnapshot: original, followUp: { id: 'F', routeId: 'A' } }), /route mismatch/);
  const next = applyFollowUp({ packageSnapshot: original, followUp: { id: 'F', routeId: 'B', evidenceKind: 'ownership', requestedItem: 'Ownership structure' }, newEvidence: [{ id: 'E6', type: 'ownership', subject: 'company' }] });
  assert.equal(original.version, 1);
  assert.equal(original.items.length, 2);
  assert.equal(next.version, 2);
  assert.equal(next.approvedAt, null);
  assert.equal(next.history[0].approval.actor, 'user');
  assert.equal(next.items.at(-1).origin, 'follow_up');
  assert.equal(next.items.at(-1).status, 'ready');
});

test('follow-up missing evidence blocks approval; explicit approval names the revision', () => {
  const original = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const next = applyFollowUp({ packageSnapshot: original, followUp: { id: 'F', routeId: 'B', evidenceKind: 'ownership' } });
  assert.equal(next.status, 'needs_review');
  assert.throws(() => approvePackage(next, { actor: 'user', approvedAt: 'now' }), /unresolved/);
  const updated = applyFollowUp({ packageSnapshot: next, followUp: { id: 'F', routeId: 'B', evidenceKind: 'ownership', proposedResponse: 'Attached' }, newEvidence: [{ id: 'E6', type: 'ownership', subject: 'company' }] });
  const approved = approvePackage(updated, { actor: 'user', approvedAt: '2026-10-01T12:00:00Z', response: 'Approved draft' });
  assert.equal(approved.approval.version, 3);
  assert.equal(approved.followUp.approvedResponse, 'Approved draft');
  assert.equal(updated.approval, null);
});

test('TC-19 removal of the shared document affects both dependent routes', () => {
  const output = buildPackages({ profile, evidence: evidence.filter(e => e.id !== 'E1'), requirementsByRoute: routes }).packages;
  assert.equal(output[0].items[0].status, 'missing');
  assert.equal(output[1].items[0].status, 'missing');
  assert.equal(output[1].items[1].status, 'ready');
});

test('TC-20 independent second proof keeps a requirement ready', () => {
  const extra = { id: 'E7', type: 'registration', subject: 'company' };
  const before = buildPackages({ profile, evidence: [...evidence, extra], requirementsByRoute: routes }).packages[0].items[0];
  const after = buildPackages({ profile, evidence, requirementsByRoute: routes }).packages[0].items[0];
  assert.deepEqual(before.evidenceIds, ['E1', 'E7']);
  assert.deepEqual(after.evidenceIds, ['E1']);
  assert.equal(after.status, 'ready');
});

test('TC-23 a representative ID cannot satisfy owner identity', () => {
  const ownerRoute = [{ ...routes[0], requirements: [{ id: 'OWNER-ID', sourceId: 'SA', evidenceType: 'id', subject: 'Alex' }] }];
  assert.equal(buildPackages({ profile, evidence, requirementsByRoute: ownerRoute }).packages[0].items[0].status, 'missing');
});

test('TC-25 prior approved snapshot remains unchanged after recalculation', () => {
  const v1 = approvePackage(buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0], { actor: 'user', approvedAt: '2026-10-01' });
  const v2 = buildPackages({ profile, evidence: evidence.filter(e => e.id !== 'E1'), requirementsByRoute: [routes[1]] }).packages[0];
  assert.equal(v1.items[0].status, 'ready');
  assert.equal(v1.approval.version, 1);
  assert.equal(v2.items[0].status, 'missing');
  assert.equal(v2.approval, null);
});

test('TC-31 conditional requirement without known condition stays uncertain', () => {
  const conditionalRoute = [{ ...routes[0], requirements: [{ id: 'MAYBE', sourceId: 'SA', evidenceType: 'registration', conditional: true }] }];
  assert.equal(buildPackages({ profile, evidence, requirementsByRoute: conditionalRoute }).packages[0].items[0].status, 'uncertain');
});

test('TC-35 stale source cannot produce a ready item', () => {
  const stale = [{ ...routes[0], requirements: [{ id: 'STALE', sourceId: 'SA', evidenceType: 'registration', sourceStatus: 'stale' }] }];
  assert.equal(buildPackages({ profile, evidence, requirementsByRoute: stale }).packages[0].items[0].status, 'uncertain');
});

test('TC-40 proposal cannot replace a valid source with another route source', () => {
  const { packages, warnings } = buildPackages({ profile, evidence, requirementsByRoute: routes, proposals: [{ routeId: 'B', requirementId: 'B1', sourceId: 'SA', evidenceIds: ['E1'], status: 'ready' }] });
  assert.equal(packages[1].items[0].sourceId, 'SB');
  assert.match(warnings.join(' '), /source or status mismatch/);
});

test('TC-41 missing model output does not remove known requirements', () => {
  const { packages } = buildPackages({ profile, evidence, requirementsByRoute: routes, proposals: [{ routeId: 'A', requirementId: 'A1', sourceId: 'SA', evidenceIds: ['E1'], status: 'ready' }] });
  assert.deepEqual(packages[0].items.map(i => i.requirementId), ['A1', 'A2']);
  assert.equal(packages[0].items[1].status, 'missing');
});

test('TC-42 unverified exclusion cannot become not_applicable', () => {
  const candidate = [{ ...routes[0], requirements: [{ id: 'EXCLUSION', sourceId: 'SA', evidenceType: 'registration', condition: { applicable: false, factId: 'no_owner' } }] }];
  const { packages } = buildPackages({ profile: { facts: { no_owner: { value: true, verified: false } } }, evidence, requirementsByRoute: candidate,
    proposals: [{ routeId: 'A', requirementId: 'EXCLUSION', sourceId: 'SA', evidenceIds: [], status: 'not_applicable' }] });
  assert.equal(packages[0].items[0].status, 'uncertain');
});

test('TC-47 cross-bank follow-up cannot mutate the selected bank', () => {
  const snapshot = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const original = structuredClone(snapshot);
  assert.throws(() => applyFollowUp({ packageSnapshot: snapshot, followUp: { id: 'F1', routeId: 'A' } }), /route mismatch/);
  assert.deepEqual(snapshot, original);
});

test('TC-50 bank follow-up is local and carries an explicit origin', () => {
  const { packages } = buildPackages({ profile, evidence, requirementsByRoute: routes });
  const revised = applyFollowUp({ packageSnapshot: packages[1], followUp: { id: 'F1', routeId: 'B', requestedItem: 'Ownership' } });
  assert.equal(revised.items.at(-1).origin, 'follow_up');
  assert.equal(revised.items.at(-1).sourceId, 'follow-up:F1');
  assert.equal(packages[0].items.length, 2);
});

test('TC-52 revised response cannot inherit an old approval', () => {
  const snapshot = approvePackage(buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0], { actor: 'user', approvedAt: '2026-10-01' });
  const v2 = applyFollowUp({ packageSnapshot: snapshot, followUp: { id: 'F1', routeId: 'B', evidenceKind: 'ownership' }, newEvidence: [{ id: 'E6', type: 'ownership', subject: 'company' }] });
  assert.equal(v2.approval, null);
  assert.equal(v2.history[0].approval.approvedAt, '2026-10-01');
  assert.equal(snapshot.approval.version, 1);
});

test('real research fixture keeps Santander online limitation separate from BPI unknown channel', () => {
  const { profile: company, evidence: docs, requirementsByRoute: bankRoutes } = researchFixture;
  const { packages } = buildPackages({ profile: company, evidence: docs, requirementsByRoute: bankRoutes });
  assert.equal(packages[0].routeEligibility.status, 'not_supported_by_published_route');
  assert.equal(packages[1].routeEligibility.status, 'check_directly');
  assert.equal(packages[1].items[0].status, 'ready');
  assert.equal(packages[1].items[2].status, 'missing');
  assert.match(packages[0].routeEligibility.rationale, /other channels/);
  assert.equal(bankRoutes[1].channel, 'unknown');
});

test('route eligibility becomes uncertain if foreign founder nationality is absent', () => {
  const company = structuredClone(researchFixture.profile);
  delete company.owners[0].nationality;
  const route = researchFixture.requirementsByRoute[0];
  assert.equal(evaluateRouteEligibility(route, company).status, 'check_directly');
});

test('TC-49 duplicate follow-up cannot create an independent obligation silently', () => {
  const snapshot = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const followUp = { id: 'F1', routeId: 'B', requestedItem: 'Ownership' };
  const v2 = applyFollowUp({ packageSnapshot: snapshot, followUp });
  assert.throws(() => applyFollowUp({ packageSnapshot: v2, followUp }), /Duplicate follow-up/);
  assert.equal(v2.items.filter(i => i.origin === 'follow_up').length, 1);
});

test('TC-05 online route limit applies to unique participants', () => {
  const online = researchFixture.requirementsByRoute[0];
  const company = structuredClone(researchFixture.profile);
  company.owners[0] = { name: 'Sofia Costa', nationality: 'PT', residenceCountry: 'PT' };
  company.owners.push({ name: 'Alex Moreno', nationality: 'PT', residenceCountry: 'PT' });
  company.owners.push({ name: 'Ines Ramos', nationality: 'PT', residenceCountry: 'PT' });
  assert.equal(evaluateRouteEligibility(online, company).status, 'possible');
  company.owners.push({ name: 'Joao Silva', nationality: 'PT', residenceCountry: 'PT' });
  assert.equal(evaluateRouteEligibility(online, company).status, 'not_supported_by_published_route');
});

test('TC-04 real research requirements retain direct provenance', () => {
  const { profile: company, evidence: docs, requirementsByRoute: bankRoutes } = researchFixture;
  const { packages } = buildPackages({ profile: company, evidence: docs, requirementsByRoute: bankRoutes });
  for (const [index, item] of packages.flatMap((pkg, p) => pkg.items.map(i => [p, i]))) {
    assert.ok(item.sourceUrl.startsWith('https://'));
    assert.equal(item.sourceRetrievedAt, bankRoutes[index].sources.find(source => source.id === item.sourceId).retrievedAt);
    assert.ok(bankRoutes[index].sources.some(source => source.id === item.sourceId));
  }
});

test('TC-08 unknown proposal evidence cannot confer ready', () => {
  const { packages } = buildPackages({ profile, evidence, requirementsByRoute: [routes[0]], proposals: [{ routeId: 'A', requirementId: 'A2', sourceId: 'SA', evidenceIds: ['UNKNOWN'], status: 'ready' }] });
  assert.equal(packages[0].items[1].status, 'missing');
  assert.deepEqual(packages[0].items[1].evidenceIds, []);
});

test('reviewed public fixture is partial and never claims a live fetch', () => {
  assert.equal(researchData, researchFixture);
  assert.equal(researchData.profile.synthetic, true);
  assert.equal(researchData.kind, 'reviewed_public');
  assert.equal(researchData.coverage, 'partial');
  assert.ok(researchData.requirementsByRoute.every(route => route.coverage === 'partial' && route.sources.every(source => source.kind === 'reviewed_public')));
});

test('unsupported eligibility source cannot declare an online route unsuitable', () => {
  const online = structuredClone(researchData.requirementsByRoute[0]);
  online.eligibilityRules[0].sourceId = 'invented';
  const eligibility = evaluateRouteEligibility(online, researchData.profile);
  assert.equal(eligibility.status, 'check_directly');
  assert.deepEqual(eligibility.sourceIds, []);
});

test('Santander online package cannot be approved even with all known documents', () => {
  const data = researchData;
  const docs = [...data.evidence,
    { id: 'CRC', type: 'crc_access_code', subject: 'company' },
    { id: 'RCBE', type: 'rcbe_access_code', subject: 'company' },
    { id: 'CMD', type: 'online_identity_access', subject: 'Sofia Costa' },
  ];
  const pkg = buildPackages({ profile: data.profile, evidence: docs, requirementsByRoute: [data.requirementsByRoute[0]] }).packages[0];
  assert.equal(pkg.routeEligibility.status, 'not_supported_by_published_route');
  assert.equal(pkg.status, 'needs_review');
  assert.throws(() => approvePackage({ ...pkg, status: 'ready' }, { actor: 'user', approvedAt: '2026-10-02' }), /does not support/);
});

test('BPI documentation checklist can be approved while channel caveat remains visible', () => {
  const data = researchData;
  const company = structuredClone(data.profile);
  company.facts = { representativeIncomeRequired: { value: false, verified: true } };
  const docs = [...data.evidence,
    { id: 'OWNER', type: 'ownership_declaration', subject: 'company' },
    { id: 'CORP', type: 'corporate_id_card', subject: 'company' },
    { id: 'TAX', type: 'representative_tax_id', subject: 'Sofia Costa' },
    { id: 'ADDR', type: 'representative_address', subject: 'Sofia Costa' },
  ];
  const pkg = buildPackages({ profile: company, evidence: docs, requirementsByRoute: [data.requirementsByRoute[1]] }).packages[0];
  assert.equal(pkg.status, 'ready');
  assert.equal(pkg.routeEligibility.status, 'check_directly');
  assert.equal(pkg.items.at(-1).status, 'not_applicable');
  const approved = approvePackage(pkg, { actor: 'user', approvedAt: '2026-10-02' });
  assert.equal(approved.routeEligibility.status, 'check_directly');
});

test('TC-37 mismatched company name or registration requires review despite matching document type', () => {
  const company = { name: 'Atlantic Studio, Lda.', registrationNumber: 'PT-123' };
  for (const fields of [{ name: 'Another Company' }, { registrationNumber: 'PT-999' }]) {
    const docs = [{ id: 'E1', type: 'registration', subject: 'company', fields }];
    const item = buildPackages({ profile: company, evidence: docs, requirementsByRoute: [routes[1]] }).packages[0].items[0];
    assert.equal(item.status, 'uncertain');
    assert.deepEqual(item.evidenceIds, []);
  }
});

test('TC-38 expired follow-up document cannot close a bank request', () => {
  const initial = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const next = applyFollowUp({ packageSnapshot: initial, followUp: { id: 'F2', routeId: 'B', evidenceKind: 'ownership_declaration' },
    newEvidence: [{ id: 'OLD', type: 'ownership_declaration', subject: 'company', validUntil: '2001-01-01' }] });
  assert.equal(next.items.at(-1).status, 'missing');
  assert.deepEqual(next.items.at(-1).evidenceIds, []);
});

test('TC-12 conflicting owners leave follow-up uncertain, not ready', () => {
  const company = { owners: [{ name: 'Sofia Costa' }, { name: 'Alex Moreno' }] };
  const initial = buildPackages({ profile: company, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const next = applyFollowUp({ packageSnapshot: initial, profile: company, followUp: { id: 'F2', routeId: 'B', evidenceKind: 'ownership_declaration' },
    newEvidence: [{ id: 'E6', type: 'ownership_declaration', subject: 'company', fields: { owners: ['Sofia Costa', 'Someone Else'] } }] });
  assert.equal(next.items.at(-1).status, 'uncertain');
  assert.equal(next.status, 'needs_review');
});

test('TC-23 ownership evidence for a person cannot close company ownership follow-up', () => {
  const initial = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const next = applyFollowUp({ packageSnapshot: initial, followUp: { id: 'F2', routeId: 'B', evidenceKind: 'ownership_declaration' },
    newEvidence: [{ id: 'E6', type: 'ownership_declaration', subject: 'Sofia Costa' }] });
  assert.equal(next.items.at(-1).status, 'missing');
});

test('Santander route blocker survives follow-up recalculation', () => {
  const { profile: company, evidence: docs, requirementsByRoute: bankRoutes } = researchData;
  const initial = buildPackages({ profile: company, evidence: docs, requirementsByRoute: [bankRoutes[0]] }).packages[0];
  const next = applyFollowUp({ packageSnapshot: initial, profile: company, followUp: { id: 'F2', routeId: bankRoutes[0].routeId, evidenceKind: 'ownership_declaration' },
    newEvidence: [{ id: 'E6', type: 'ownership_declaration', subject: 'company' }] });
  assert.equal(next.routeEligibility.status, 'not_supported_by_published_route');
  assert.equal(next.status, 'needs_review');
});

test('TC-49 duplicate follow-up uses request and evidence, regardless of response draft', () => {
  const initial = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const followUp = { id: 'F2', routeId: 'B', requestedItem: 'Ownership', proposedResponse: 'First draft', evidenceKind: 'ownership_declaration' };
  const newEvidence = [{ id: 'E6', type: 'ownership_declaration', subject: 'company' }];
  const next = applyFollowUp({ packageSnapshot: initial, followUp, newEvidence });
  assert.throws(() => applyFollowUp({ packageSnapshot: next, followUp: { ...followUp, proposedResponse: 'Reworded draft' }, newEvidence }), error => error.code === 'DUPLICATE_FOLLOWUP' && error.status === 409);
});

test('stale eligibility publication requires direct check before route recommendation', () => {
  const online = structuredClone(researchData.requirementsByRoute[0]);
  online.sources[0].stale = true;
  const result = evaluateRouteEligibility(online, researchData.profile);
  assert.equal(result.status, 'check_directly');
  assert.match(result.rationale, /stale/);
});

test('unavailable eligibility publication cannot declare a route possible', () => {
  const online = structuredClone(researchData.requirementsByRoute[0]);
  online.sources[0].unavailable = true;
  const company = structuredClone(researchData.profile);
  company.owners[0].nationality = 'PT';
  assert.equal(evaluateRouteEligibility(online, company).status, 'check_directly');
});

test('a source-valid AI uncertainty cannot be upgraded to ready by matching evidence', () => {
  const { packages } = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]], proposals: [
    { routeId: 'B', requirementId: 'B1', sourceId: 'SB', evidenceIds: ['E1'], status: 'uncertain', rationale: 'Document needs inspection' },
  ] });
  assert.equal(packages[0].items[0].status, 'uncertain');
  assert.equal(packages[0].status, 'needs_review');
});

test('research ownership follow-up is consistent with the sample company', () => {
  const pkg = buildPackages({ profile: researchData.profile, evidence: researchData.evidence, requirementsByRoute: [researchData.requirementsByRoute[1]] }).packages[0];
  const revised = applyFollowUp({ packageSnapshot: pkg, followUp: researchData.followUp, newEvidence: [researchData.followUpEvidence], profile: researchData.profile });
  assert.equal(revised.items.at(-1).status, 'ready');
});

test('TC-48 human-classified ownership and address are separate obligations', () => {
  const company = { owners: [{ name: 'Alex Moreno' }] };
  const pkg = buildPackages({ profile: company, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const followUp = { id: 'F-MULTI', routeId: 'B', humanReviewed: true, requestedItems: [
    { id: 'ownership', label: 'Ownership declaration', evidenceType: 'ownership_declaration', subject: 'company' },
    { id: 'address', label: 'Business address', evidenceType: 'address', subject: 'company' },
  ] };
  const v2 = applyFollowUp({ packageSnapshot: pkg, profile: company, followUp, newEvidence: [
    { id: 'OWN', type: 'ownership_declaration', subject: 'company', fields: { owners: ['Alex Moreno'] } },
  ] });
  assert.deepEqual(v2.items.slice(-2).map(item => [item.requirementId, item.status]), [['follow-up:F-MULTI:ownership', 'ready'], ['follow-up:F-MULTI:address', 'missing']]);
  assert.equal(v2.status, 'needs_review');
  const v3 = applyFollowUp({ packageSnapshot: v2, profile: company, followUp, newEvidence: [
    { id: 'OWN', type: 'ownership_declaration', subject: 'company', fields: { owners: ['Alex Moreno'] } },
    { id: 'ADDR', type: 'address', subject: 'company' },
  ] });
  assert.deepEqual(v3.items.slice(-2).map(item => item.status), ['ready', 'ready']);
  assert.equal(v3.status, 'ready');
});

test('TC-48 compound request rejects wrong subject and expired address evidence', () => {
  const pkg = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const followUp = { id: 'F-MULTI', routeId: 'B', humanReviewed: true, requestedItems: [
    { id: 'ownership', label: 'Ownership', evidenceType: 'ownership_declaration', subject: 'company' },
    { id: 'address', label: 'Address', evidenceType: 'address', subject: 'company' },
  ] };
  const next = applyFollowUp({ packageSnapshot: pkg, followUp, newEvidence: [
    { id: 'OWN', type: 'ownership_declaration', subject: 'Alex' },
    { id: 'ADDR', type: 'address', subject: 'company', validUntil: '2000-01-01' },
  ] });
  assert.deepEqual(next.items.slice(-2).map(item => item.status), ['missing', 'missing']);
});

test('unknown follow-up text cannot use evidence without explicit human classification', () => {
  const pkg = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const next = applyFollowUp({ packageSnapshot: pkg, followUp: { id: 'F-UNKNOWN', routeId: 'B', text: 'Please clarify documents', requestedItems: [
    { id: 'x', label: 'Ownership', evidenceType: 'ownership_declaration', subject: 'company' },
  ], humanReviewed: false }, newEvidence: [{ id: 'OWN', type: 'ownership_declaration', subject: 'company' }] });
  assert.equal(next.items.at(-1).requirementId, 'follow-up:F-UNKNOWN');
  assert.equal(next.items.at(-1).status, 'missing');
  assert.throws(() => approvePackage(next, { actor: 'user', approvedAt: '2026-10-02' }), /unresolved/);
});

test('two bank follow-ups remain distinct through subsequent revisions', () => {
  const pkg = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const first = { id: 'F1', routeId: 'B', requestedItem: 'Ownership', evidenceKind: 'ownership_declaration', subject: 'company', humanReviewed: true,
    requestedItems: [{ id: 'owners', label: 'Owners', evidenceType: 'ownership_declaration', subject: 'company' }] };
  const second = { id: 'F2', routeId: 'B', requestedItem: 'Address', evidenceKind: 'address', subject: 'company', humanReviewed: true,
    requestedItems: [{ id: 'address', label: 'Address', evidenceType: 'address', subject: 'company' }] };
  const v2 = applyFollowUp({ packageSnapshot: pkg, followUp: first });
  const v3 = applyFollowUp({ packageSnapshot: v2, followUp: second });
  assert.deepEqual(v3.followUps.map(request => request.id), ['F1', 'F2']);
  assert.deepEqual(v3.items.filter(item => item.origin === 'follow_up').map(item => item.requirementId), ['follow-up:F1:owners', 'follow-up:F2:address']);
  assert.equal(v3.status, 'needs_review');
  const v4 = applyFollowUp({ packageSnapshot: v3, followUp: first, newEvidence: [{ id: 'OWN', type: 'ownership_declaration', subject: 'company' }] });
  assert.deepEqual(v4.followUps.map(request => request.id), ['F2', 'F1']);
  assert.equal(v4.items.find(item => item.requirementId === 'follow-up:F2:address').status, 'missing');
  assert.equal(v4.status, 'needs_review');
});

test('duplicate of an older follow-up is detected after a different bank request', () => {
  const pkg = buildPackages({ profile, evidence, requirementsByRoute: [routes[1]] }).packages[0];
  const f1 = { id: 'F1', routeId: 'B', requestedItem: 'Ownership', humanReviewed: true, requestedItems: [{ id: 'ownership', label: 'Ownership', evidenceType: 'ownership_declaration', subject: 'company' }] };
  const f2 = { id: 'F2', routeId: 'B', requestedItem: 'Address', humanReviewed: true, requestedItems: [{ id: 'address', label: 'Address', evidenceType: 'address', subject: 'company' }] };
  const afterF1 = applyFollowUp({ packageSnapshot: pkg, followUp: f1 });
  const afterF2 = applyFollowUp({ packageSnapshot: afterF1, followUp: f2 });
  assert.throws(() => applyFollowUp({ packageSnapshot: afterF2, followUp: f1 }), error => error.code === 'DUPLICATE_FOLLOWUP' && error.status === 409);
});

test('evidence without a stable ID never produces ready status', () => {
  const result = buildPackages({ profile, evidence: [{ type: 'registration', subject: 'company' }], requirementsByRoute: [routes[1]] });
  assert.equal(result.packages[0].items[0].status, 'missing');
  assert.deepEqual(result.packages[0].items[0].evidenceIds, []);
});

test('TC-39 published AND requirement is ready only with evidence from every group', () => {
  const compound = [{ ...routes[0], requirements: [{ id: 'OWNERSHIP', sourceId: 'SA', label: 'Ownership evidence', evidenceGroups: [
    { id: 'register', evidenceKinds: ['registration'], subject: 'company' },
    { id: 'owner-id', evidenceKinds: ['id'], subject: 'Alex' },
  ] }] }];
  const before = buildPackages({ profile, evidence, requirementsByRoute: compound }).packages[0].items[0];
  assert.equal(before.status, 'missing');
  assert.deepEqual(before.evidenceIds, ['E1']);
  const complete = buildPackages({ profile, evidence: [...evidence, { id: 'E4', type: 'id', subject: 'Alex' }], requirementsByRoute: compound }).packages[0].items[0];
  assert.equal(complete.status, 'ready');
  assert.deepEqual(complete.evidenceIds, ['E1', 'E4']);
});

test('TC-39 AI cannot bypass a missing AND group by citing only one proof', () => {
  const compound = [{ ...routes[0], requirements: [{ id: 'OWNERSHIP', sourceId: 'SA', evidenceGroups: [
    { id: 'register', evidenceKinds: ['registration'], subject: 'company' },
    { id: 'owner-id', evidenceKinds: ['id'], subject: 'Alex' },
  ] }] }];
  const output = buildPackages({ profile, evidence, requirementsByRoute: compound, proposals: [
    { routeId: 'A', requirementId: 'OWNERSHIP', sourceId: 'SA', evidenceIds: ['E1'], status: 'ready' },
  ] }).packages[0].items[0];
  assert.equal(output.status, 'missing');
});

test('TC-39 one document may satisfy multiple groups only if its type is allowed in each', () => {
  const compound = [{ ...routes[0], requirements: [{ id: 'COMPANY', sourceId: 'SA', evidenceGroups: [
    { id: 'name', evidenceKinds: ['registration'], subject: 'company' },
    { id: 'number', evidenceKinds: ['registration'], subject: 'company' },
  ] }] }];
  const output = buildPackages({ profile, evidence, requirementsByRoute: compound }).packages[0].items[0];
  assert.equal(output.status, 'ready');
  assert.deepEqual(output.evidenceIds, ['E1']);
});

test('TC-18 conflicting business address is uncertain even with matching evidence type', () => {
  const addressProfile = { facts: { address: 'Lisbon' } };
  const addressRoute = [{ ...routes[0], requirements: [{ id: 'ADDRESS', sourceId: 'SA', evidenceType: 'address', subject: 'company' }] }];
  const docs = [{ id: 'ADDR', type: 'address', subject: 'company', fields: { address: 'Porto' } }];
  const output = buildPackages({ profile: addressProfile, evidence: docs, requirementsByRoute: addressRoute }).packages[0].items[0];
  assert.equal(output.status, 'uncertain');
  assert.deepEqual(output.evidenceIds, []);
});

test('human classification replaces the unclassified item for the same request', () => {
  const initial = buildPackages(demoData).packages[1];
  const unclassified = applyFollowUp({ packageSnapshot: initial, followUp: { id:'unknown', routeId:'B', requestedItem:'Provide ownership', evidenceKind:'__unknown__' }, newEvidence: [] });
  const classified = applyFollowUp({ packageSnapshot:unclassified, followUp:{id:'unknown',routeId:'B',requestedItem:'Provide ownership',humanReviewed:true,requestedItems:[{id:'owners',label:'Ownership',evidenceType:'ownership_chart',subject:'company'}]},newEvidence:[demoData.followUpEvidence],profile:demoData.profile });
  assert.equal(classified.items.filter(item => item.origin === 'follow_up').length,1);
  assert.equal(classified.status,'ready');
});
import { demoData } from '../app/demo-data.mjs';

test('reclassification replaces all old items of one request while retaining a different request', () => {
  const initial = buildPackages(demoData).packages[1];
  const first = applyFollowUp({ packageSnapshot:initial,followUp:{id:'F1',routeId:'B',requestedItem:'Ownership and address',humanReviewed:true,requestedItems:[{id:'owner',label:'Owner',evidenceType:'ownership_chart',subject:'company'},{id:'addr',label:'Address',evidenceType:'address',subject:'company'}]},newEvidence:[demoData.followUpEvidence],profile:demoData.profile });
  const second = applyFollowUp({ packageSnapshot:first,followUp:{id:'F2',routeId:'B',requestedItem:'Other request',evidenceKind:'__unknown__'},newEvidence:[],profile:demoData.profile });
  const corrected = applyFollowUp({ packageSnapshot:second,followUp:{id:'F1',routeId:'B',requestedItem:'Ownership only',humanReviewed:true,requestedItems:[{id:'reclassified-owner',label:'Ownership',evidenceType:'ownership_chart',subject:'company'}]},newEvidence:[demoData.followUpEvidence],profile:demoData.profile });
  assert.deepEqual(corrected.items.filter(item=>item.sourceId==='follow-up:F1').map(item=>item.requirementId),['follow-up:F1:reclassified-owner']);
  assert.ok(corrected.items.some(item=>item.sourceId==='follow-up:F2'));
});

test('Company identity contradictions remain uncertain when a model omits the conflicting proof',()=>{
 const p={name:'Correct Lda',registrationNumber:'PT-001'};const route={routeId:'r',sources:[{id:'s'}],requirements:[{id:'req',sourceId:'s',evidenceType:'registry',subject:'company'}]};
 for(const fields of [{name:'Other Lda'},{registrationNumber:'PT-OTHER'}]){
  const pkg=buildPackages({profile:p,evidence:[{id:'e',type:'registry',subject:'company',fields}],requirementsByRoute:[route],proposals:[{routeId:'r',requirementId:'req',sourceId:'s',status:'missing',evidenceIds:[]}]}).packages[0];assert.equal(pkg.items[0].status,'uncertain');assert.equal(pkg.status,'needs_review');
 }
});
