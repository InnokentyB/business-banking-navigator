// Entirely fictional data and bank routes. Do not present these as bank policy.
export const demoData = {
  profile: {
    id: 'atlantic-studio', name: 'Atlantic Studio, Lda.', registrationNumber: 'SYN-PT-0001',
    activity: 'Software development', representative: { name: 'Sofia Costa' },
    owners: [{ name: 'Sofia Costa' }, { name: 'Alex Moreno' }], facts: { address: 'Lisbon, Portugal' },
    synthetic: true
  },
  evidence: [
    { id: 'E1', type: 'registry_extract', subject: 'company', fields: { name: 'Atlantic Studio, Lda.', registrationNumber: 'SYN-PT-0001' }, synthetic: true },
    { id: 'E2', type: 'articles', subject: 'company', fields: { name: 'Atlantic Studio, Lda.' }, synthetic: true },
    { id: 'E3', type: 'identity', subject: 'Sofia Costa', fields: { name: 'Sofia Costa' }, synthetic: true },
    { id: 'E4', type: 'activity_description', subject: 'company', fields: { activity: 'Software development' }, synthetic: true }
  ],
  requirementsByRoute: [
    {
      routeId: 'A', bank: 'Bank A (fictional)', routeName: 'Online business account (fictional)',
      sources: [{ id: 'SA', url: 'https://example.test/bank-a/online', excerpt: 'Synthetic: registry extract, representative ID and proof of business address. Online route may be subject to participant criteria.', retrievedAt: '2026-10-01T00:00:00Z', kind: 'synthetic' }],
      requirements: [
        { id: 'A1', sourceId: 'SA', label: 'Company registry extract', evidenceType: 'registry_extract', subject: 'company' },
        { id: 'A2', sourceId: 'SA', label: 'Representative identity', evidenceType: 'identity', subject: 'Sofia Costa' },
        { id: 'A3', sourceId: 'SA', label: 'Proof of business address', evidenceType: 'address', subject: 'company' },
        { id: 'A4', sourceId: 'SA', label: 'Online route participant criteria', evidenceType: 'eligibility', conditional: true }
      ]
    },
    {
      routeId: 'B', bank: 'Bank B (fictional)', routeName: 'Assisted business account (fictional)',
      sources: [{ id: 'SB', url: 'https://example.test/bank-b/assisted', excerpt: 'Synthetic: registry extract, articles of association and business activity description.', retrievedAt: '2026-10-01T00:00:00Z', kind: 'synthetic' }],
      requirements: [
        { id: 'B1', sourceId: 'SB', label: 'Company registry extract', evidenceType: 'registry_extract', subject: 'company' },
        { id: 'B2', sourceId: 'SB', label: 'Articles of association', evidenceType: 'articles', subject: 'company' },
        { id: 'B3', sourceId: 'SB', label: 'Business activity description', evidenceType: 'activity_description', subject: 'company' }
      ]
    }
  ],
  followUp: { id: 'F1', routeId: 'B', text: 'Please clarify the ownership structure and provide supporting evidence.', requirement: { id: 'B4', sourceId: 'F1', label: 'Ownership structure supporting evidence', evidenceType: 'ownership_chart', subject: 'company' } },
  followUpEvidence: { id: 'E6', type: 'ownership_chart', subject: 'company', fields: { owners: ['Sofia Costa', 'Alex Moreno'] }, synthetic: true }
};
