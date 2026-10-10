// Manually reviewed partial source summaries. Provider acceptance remains unknown.
const date = '2026-10-04';
const source = (id, url, excerpt) => ({id,url,excerpt,retrievedAt:date,reviewedAt:date,reviewer:'local-public-source-review',kind:'reviewed_public',publisher:'provider'});
const req = (id, sourceId, label, evidenceType, subject='company', extra={}) => ({id,sourceId,label,evidenceType,subject,...extra});
const scope = (id, sid) => req(id,sid,'Review legal form, all participants, document details and current provider conditions before using this partial checklist','route_scope_review','company',{conditional:true});
const c='CGD-DOC-2026-10-04', n='NOVO-LDA-2026-10-04', q='QONTO-DOC-2026-10-04', p='QONTO-PEOPLE-2026-10-04', f='QONTO-FORMS-2026-10-04';
export const additionalResearchRoutes = [
 {routeId:'cgd-pt-company-branch',bank:'Caixa Geral de Depósitos',routeName:'Portuguese commercial company · branch documentation',channel:'branch',coverage:'partial',eligibilityRules:[],officialDomains:['cgd.pt'],searchQuery:'Abertura Conta Empresas Sociedades Comerciais RCBE documentos',
  scopeNote:'Commercial companies only. Originals or certified copies; registration issued within six months. Review every representative and current bank forms. Foreign legal entities have a separate section.',
  sources:[source(c,'https://www.cgd.pt/Empresas/Gestao_corrente/Contas-ordem/Documents/Abertura-Conta-Empresas.pdf','Commercial companies: registration issued within six months, corporate identification, ownership percentages and RCBE certificate/code. Each representative: identity, tax, address and profession evidence; residence authorization for foreign residents and public-office declaration where applicable. Originals or certified copies; visit a branch. Summary, not verbatim.')],
  requirements:[
   req('CGD-REG',c,'Registration or accepted public alternative issued within six months; review date and certification','commercial_registration','company',{conditional:true}),
   req('CGD-NIPC',c,'Corporate identification card or public document containing NIPC','corporate_id_card','company',{evidenceKinds:['corporate_id_card','corporate_nipc_document']}),
   req('CGD-OWNERS',c,'Company declaration identifying owners and percentage holdings','ownership_declaration'),
   req('CGD-RCBE',c,'RCBE certificate or access code','rcbe_access_code','company',{evidenceKinds:['rcbe_access_code','rcbe_certificate']}),
   req('CGD-REP-ID',c,'Valid representative identity; repeat for every representative','representative_id','Sofia Costa'),
   req('CGD-REP-TAX',c,'Representative tax identity; review published exceptions for residents abroad','representative_tax_id','Sofia Costa',{conditional:true}),
   req('CGD-REP-ADDRESS',c,'Representative address evidence','representative_address','Sofia Costa'),
   req('CGD-PROFESSION',c,'Representative profession and employer evidence','representative_income','Sofia Costa'),
   req('CGD-RESIDENCE',c,'Residence authorization for foreign citizens resident in Portugal, where applicable','residence_permit','Sofia Costa',{conditional:true}),
   req('CGD-PEP',c,'Declaration of public office where applicable','pep_declaration','Sofia Costa',{conditional:true}),scope('CGD-SCOPE',c)]},
 {routeId:'novobanco-pt-lda-documents',bank:'novobanco',routeName:'Sociedade por Quotas · documentation',channel:'unknown',coverage:'partial',eligibilityRules:[],officialDomains:['novobanco.pt'],searchQuery:'Sociedade por Quotas abertura conta documentos CRC RCBE',
  scopeNote:'Lda checklist. Identify shareholders at ≥5%; review full ownership chain. Identity alternatives depend on nationality/residence. Opening channel is not confirmed.',
  sources:[source(n,'https://www.novobanco.pt/content/dam/novobancopublicsites/docs/pdfs/empresas/abertura-de-conta/Sociedade_por_Quotas.pdf.coredownload.inline.pdf','Lda: CRC, management declaration, capital holders at least 5%, RCBE plus an accepted ownership proof alternative. Representatives need identity, tax, address and authority evidence. Address proofs issued within six months. Documents outside PT/ES/EN/FR require certified/authenticated translation. Summary, not verbatim.')],
  requirements:[
   req('NOVO-CRC',n,'Commercial registration certificate (CRC)','commercial_registration'),
   req('NOVO-MANAGEMENT',n,'Company declaration or email identifying management and personal details','management_declaration'),
   req('NOVO-SHAREHOLDERS',n,'Company declaration or email identifying capital holders at or above 5%','shareholder_declaration'),
   req('NOVO-STRUCTURE',n,'RCBE AND accepted ownership proof: CRC with individual owners, signed full chart, or qualifying corporate document; review chain and dates','ownership_chart','company',{conditional:true,evidenceGroups:[{id:'rcbe',evidenceKinds:['rcbe_access_code','rcbe_certificate'],subject:'company'},{id:'ownership-proof',evidenceKinds:['commercial_registration','ownership_chart','corporate_ownership_document'],subject:'company'}]}),
   req('NOVO-REP-ID',n,'Representative identity: review nationality/residence-specific alternative','representative_id','Sofia Costa',{conditional:true}),
   req('NOVO-REP-TAX',n,'Representative tax identity: review country-specific alternative','representative_tax_id','Sofia Costa',{conditional:true}),
   req('NOVO-REP-ADDRESS',n,'Representative address evidence issued within six months; review accepted alternative','representative_address','Sofia Costa',{conditional:true}),
   req('NOVO-AUTHORITY',n,'Representative authority: CRC or authenticated power of attorney as applicable','representative_authority','Sofia Costa',{conditional:true}),
   req('NOVO-TRANSLATION',n,'Certified/authenticated translation if documents are outside PT/ES/EN/FR','certified_translation','company',{conditional:true}),scope('NOVO-SCOPE',n)]},
 {routeId:'qonto-pt-lda-online',bank:'Qonto',routeName:'Portugal Lda · online payment account',channel:'online',coverage:'partial',eligibilityRules:[],officialDomains:['qonto.com'],searchQuery:'Portugal Sociedade por Quotas Certidão Permanente RCBE documentos conta Qonto',
  scopeNote:'Portugal Lda supported. Official pages differ at exactly 5% shareholding (>5% versus ≥5%): resolve directly. Complete participant and eligibility review required. PT IBAN not established.',
  sources:[
   source(q,'https://support-pt.qonto.com/hc/en-us/articles/30359527698065-List-of-the-documents-required-to-open-a-Qonto-account','Lda: Certidão Permanente with valid verification code and RCBE information. Documentation from managing director and shareholders above 5%; power of attorney if applicant is not the person indicated in the certificate. Summary, not verbatim.'),
   source(p,'https://support-pt.qonto.com/hc/pt/articles/37628192489361-Quem-preciso-de-identificar-e-que-informação-é-necessária','SMEs: identify UBOs above 25% or exercising control, shareholders at least 5%, authorized operators and administrators. Identity copy, tax number, birth information, nationality, residence, role/percentage; full chain for complex ownership. Summary, not verbatim.'),
   source(f,'https://support-pt.qonto.com/hc/en-us/articles/48803661054481-Can-any-organization-open-a-Qonto-account','Portugal is supported; national eligible legal forms include Lda, TIN and ENI. Registration and headquarters must be in a supported country. Summary, not verbatim.'),
   source('QONTO-ONLINE-2026-10-04','https://qonto.com/pt/open-an-account/abertura-conta-pj','Online opening offered for Portuguese business accounts, subject to supporting documents and provider verification. Summary, not verbatim.')],
  requirements:[
   req('QONTO-CRC',q,'Certidão Permanente with valid verification code; confirm code validity','crc_access_code','company',{conditional:true}),
   req('QONTO-RCBE',q,'Company and beneficial-owner information registered in RCBE','rcbe_certificate'),
   req('QONTO-MANAGER',p,'Managing representative identity copy and personal/tax details','representative_id','Sofia Costa',{evidenceGroups:[{id:'identity',evidenceKinds:['representative_id'],subject:'Sofia Costa'},{id:'details',evidenceKinds:['participant_details'],subject:'Sofia Costa'}]}),
   req('QONTO-SHAREHOLDERS',p,'Review shareholder documentation threshold: official pages differ at exactly 5%','shareholder_declaration','company',{conflict:true}),
   req('QONTO-PEOPLE',p,'Identify all applicable UBOs, authorized operators and administrators, including ownership chain','participant_register','company',{conditional:true}),
   req('QONTO-POA',q,'Power of attorney if applicant is not indicated in Certidão Permanente','power_of_attorney','Sofia Costa',{conditional:true}),scope('QONTO-SCOPE',f)]},
];
