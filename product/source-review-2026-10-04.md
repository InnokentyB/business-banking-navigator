# Route source review — 4 October 2026

Scope: selected public requirements for synthetic workflow testing, not a complete bank checklist or bank acceptance. Live source payloads, retrieval timestamps and hashes are retained under ignored `artifacts/`.

## Santander company online route

[Official route page](https://www.santander.pt/empresas/abrir-conta-empresas-online) checked through browsing and Tavily. The published online flow identifies CRC/RCBE access, online identity access and Citizen Card requirements. It limits participants, requires Portuguese nationality and residence, and imposes additional ownership/PEP constraints. These are channel-specific; they do not establish rejection by Santander as a bank.

The fixture remains partial: it does not model every published eligibility condition. After source replacement, old eligibility-rule references become stale and require independent re-review; the live workflow keeps Santander unapproved. Automatic eligibility-rule migration is deliberately absent.

## BPI documentation route

[Document landing page](https://www.bancobpi.pt/empresas/documentacao-para-abrir-conta) and [alternative-evidence checklist](https://www.bancobpi.pt/empresas/check-list-de-abertura-de-conta) checked directly. Tavily extracts the landing page incompletely, so its text alone cannot substantiate the whole checklist. The checklist yields usable text and published examples for representative identity, tax, residence and profession evidence, plus company registration and identification.

Opened linked [company information form](https://www.bancobpi.pt/contentservice/getContent?documentName=PR_UCMS02062673) and [individual information form](https://www.bancobpi.pt/contentservice/getContent?documentName=NZBHODNHZDG1YJA3NGQ4). Real Tavily advanced extraction succeeded for both PDFs and both web pages. Company form includes identification, tax residency, activity, intended business relationship/funds, representatives and ownership information. Individual form contains personal/KYC data fields. These blank public forms were read only; no form was filled or transmitted.

The landing page describes the ownership declaration using a 25% threshold, while the company form collects a broader set of holders from 5%. They serve different document contexts; do not substitute one threshold for the other or infer that ownership discovery is complete. Current release still lacks automatic ownership-chain resolution and full form preparation. BPI channel applicability remains `check_directly`.

## Live workflow review decisions

Santander's current candidate was assigned to its three selected requirement lines. BPI's current checklist was assigned to registration, representative identity, corporate ID, tax, address and profession lines. The written ownership declaration retained its separately checked landing-page reference.

For this one synthetic BPI scenario the reviewer made profession evidence explicitly required, using the published checklist examples, and supplied synthetic metadata of the selected evidence type. This is a session-specific review, not a global claim that every person must supply a payslip. Global fixture conditions were not silently changed. BPI approval certifies the selected package revision only; the coverage and channel caveats remain.
