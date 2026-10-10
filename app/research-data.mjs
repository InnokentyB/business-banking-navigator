import {europeanResearchRoutes} from './european-research-routes.mjs';
import {revolutResearchRoute} from './revolut-research-route.mjs';
import { additionalResearchRoutes } from './additional-research-routes.mjs';
/** Research snapshot only. Public pages are not a promise of account approval. */
export const researchFixture = {
  id: 'pt-nine-providers-research-2026-10-07',
  kind: 'reviewed_public',
  version: 4,
  verifiedAt: '2026-10-07',
  coverage: 'partial',
  coverageNote: 'A dated selection of published requirements; banks may request additional information. Confirm current wording and channel before applying.',
  profile: {
    id: 'research-company-1', name: 'Atlantic Studio, Lda.', country: 'PT', synthetic: true,
    registrationNumber: 'SYNTHETIC-0001', activity: 'Software development',
    representative: { name: 'Sofia Costa', nationality: 'PT', residenceCountry: 'PT' },
    representatives: [{ name: 'Sofia Costa', nationality: 'PT', residenceCountry: 'PT' }],
    owners: [{ name: 'Alex Moreno', nationality: 'ES', residenceCountry: 'PT' }],
  },
  evidence: [
    { id: 'RE1', type: 'commercial_registration', subject: 'company', fields: { name: 'Atlantic Studio, Lda.' }, synthetic: true },
    { id: 'RE2', type: 'representative_id', subject: 'Sofia Costa', fields: { name: 'Sofia Costa' }, synthetic: true },
  ],
  requirementsByRoute: [
    {
      routeId: 'santander-pt-company-online', bank: 'Santander Portugal', routeName: 'Company online opening', channel: 'online',
      coverage: 'partial', officialDomains: ['santander.pt'], searchQuery: 'site:santander.pt/empresas/abrir-conta-empresas-online abrir conta empresa online requisitos CRC RCBE',
      sources: [{ id: 'SANT-ONLINE-2026-10-02', url: 'https://www.santander.pt/empresas/abrir-conta-empresas-online', excerpt: 'todos os intervenientes devem ter nacionalidade portuguesa e viver em Portugal, na morada fiscal', retrievedAt: '2026-10-02', kind: 'reviewed_public', publisher: 'bank' }],
      eligibilityRules: [
        { kind: 'all_participants_nationality', equals: 'PT', sourceId: 'SANT-ONLINE-2026-10-02' },
        { kind: 'all_participants_residence', equals: 'PT', sourceId: 'SANT-ONLINE-2026-10-02' },
        { kind: 'maximum_participants', maximum: 3, sourceId: 'SANT-ONLINE-2026-10-02' },
        { kind: 'company_country', equals: 'PT', sourceId: 'SANT-ONLINE-2026-10-02' },
      ],
      requirements: [
        { id: 'SANT-CRC', sourceId: 'SANT-ONLINE-2026-10-02', label: 'Valid CRC access code', evidenceType: 'crc_access_code', subject: 'company' },
        { id: 'SANT-RCBE', sourceId: 'SANT-ONLINE-2026-10-02', label: 'RCBE access code', evidenceType: 'rcbe_access_code', subject: 'company' },
        { id: 'SANT-CMD-CC', sourceId: 'SANT-ONLINE-2026-10-02', label: 'CMD or eligible NetBanco access and valid Citizen Card for this online process', evidenceType: 'online_identity_access', subject: 'Sofia Costa', conditional: true },
      ],
    },
    {
      routeId: 'bpi-pt-company-documents', bank: 'Banco BPI', routeName: 'Company account documentation', channel: 'unknown',
      coverage: 'partial', officialDomains: ['bancobpi.pt'], searchQuery: 'Check-list de abertura de conta empresas representantes documentos',
      sources: [
        { id: 'BPI-DOC-2026-10-02', url: 'https://www.bancobpi.pt/empresas/documentacao-para-abrir-conta', excerpt: 'Certidão da Conservatória do Registo Comercial (CCRC)', retrievedAt: '2026-10-02', kind: 'reviewed_public', publisher: 'bank' },
        { id: 'BPI-CHECK-2026-10-02', url: 'https://www.bancobpi.pt/empresas/check-list-de-abertura-de-conta', excerpt: 'Cartão de Cidadão ou Bilhete de Identidade ... ou Passaporte', retrievedAt: '2026-10-02', kind: 'reviewed_public', publisher: 'bank' },
      ],
      eligibilityRules: [],
      requirements: [
        { id: 'BPI-CCRC', sourceId: 'BPI-DOC-2026-10-02', label: 'Commercial registration certificate', evidenceType: 'commercial_registration', subject: 'company' },
        { id: 'BPI-REP-ID', sourceId: 'BPI-CHECK-2026-10-02', label: 'Identity evidence for representative; alternatives exist', evidenceType: 'representative_id', subject: 'Sofia Costa' },
        { id: 'BPI-OWNERS', sourceId: 'BPI-DOC-2026-10-02', label: 'Written declaration of management and holders at or above 25%', evidenceType: 'ownership_declaration', subject: 'company' },
        { id: 'BPI-CORP-ID', sourceId: 'BPI-DOC-2026-10-02', label: 'Corporate identification card', evidenceType: 'corporate_id_card', subject: 'company' },
        { id: 'BPI-REP-TAX', sourceId: 'BPI-DOC-2026-10-02', label: 'Representative tax identification', evidenceType: 'representative_tax_id', subject: 'Sofia Costa' },
        { id: 'BPI-REP-ADDRESS', sourceId: 'BPI-DOC-2026-10-02', label: 'Representative address evidence', evidenceType: 'representative_address', subject: 'Sofia Costa' },
        { id: 'BPI-REP-INCOME', sourceId: 'BPI-DOC-2026-10-02', label: 'Representative income or profession evidence; confirm applicable alternative', evidenceType: 'representative_income', subject: 'Sofia Costa', condition: { field: 'representativeIncomeRequired', equals: true } },
      ],
    },
    ...additionalResearchRoutes,
    revolutResearchRoute,
    ...europeanResearchRoutes,
  ],
  followUp: { id: 'RESEARCH-F1', routeId: 'bpi-pt-company-documents', text: 'Synthetic example: please clarify the ownership structure.', requestedItem: 'Ownership structure', evidenceKind: 'ownership_declaration', proposedResponse: 'Draft: attached is the ownership declaration.' },
  followUpEvidence: { id: 'RE3', type: 'ownership_declaration', subject: 'company', fields: { owners: ['Alex Moreno'] }, synthetic: true },
};

export const researchData = researchFixture;
