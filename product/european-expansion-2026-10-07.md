# European alternatives for Portuguese companies · 2026-10-07

Problem: a PT Lda founder needs more European alternatives for international operations, without confusing a product listing with company approval. Existing web comparison and preparation journey, synthetic inputs and session authorization remain the delivery boundary. No bank API connection or application is performed.

## Reviewed evidence baseline

- Wise Business: https://wise.com/pt/pricing/business — currency holding free, EUR 60 one-time full-feature/account-details setup, variable sending/conversion fees. https://wise.com/help/articles/2769792/how-can-i-verify-my-business/ — online verification, registration/trading address, ownership, ID, authority; extra documents requested conditionally. Company country, legal form and activity acceptance remain open.
- Paysera: https://www.paysera.com/v2/en-GB/fees/account-management-and-identification-business — standard other-SEPA category EUR 5/month, online opening free; international/financial-provider category EUR 20/month plus EUR 100 opening. Categories are alternatives requiring classification, not selectable plans. Included transfers are not treated as combined SEPA/direct-debit allowance. https://www.paysera.com/v2/en-FR/business-account-opening — personal identity first, browser flow for countries outside listed app countries, registration/head appointment/shareholders, provider approval.
- bunq: https://www.bunq.com/pt-pt/business/plans — Core 7.99, Pro 13.99, Elite 23.99 EUR/month; Free is sole-trader only and excluded for Lda. https://help.bunq.com/en-fr/articles/who-can-open-a-bunq-business-account lists Portugal, verified personal account, EEA residence, accepted legal forms/ownership/activity. Its Portuguese cross-border example names EIRL rather than Lda. https://help.bunq.com/en-fr/articles/can-i-open-an-account-if-im-european-but-living-abroad omits Portugal from business countries. Country discrepancy is unresolved and shown in the decision explanation.

All sources retrieved 2026-10-07, official public, manually reviewed. Runtime offers version pt-nine-providers-2026-10-07-v5 and fixture version 4. Only published currency holding is a confirmed multicurrency fact. No PT reference/tax payment or PT IBAN claim. Wise/Paysera are payment-provider alternatives, not assumed identical to bank accounts. Taxes, variable fees and full first-year cost remain unmodeled. Setup fees are visible separately in notes rather than incorrectly folded into recurring cost.

## Acceptance and traceability

EU-01: Research session → Lda online need → three new candidates with sources/prices and unresolved acceptance. Tests/european-providers.test.mjs and tests/european-e2e.mjs.
EU-02: Choose Wise → preparation → deterministic analysis → approval disabled → reload retains selection. Browser scenario above.
EU-03: Matching synthetic document types cannot approve any of the partial routes. Unit/domain scenario above.
EU-04: Paysera category distinctions and bunq Free exclusion; bunq conflict appears in rationale. Unit scenario above.

RED: artifacts/european-red.txt and european-browser-red.txt fail because Wise is absent. GREEN: european-browser-green.txt, european-unit.txt (165/165), european-offline.txt (26/26). Existing decision/report and tariff browser scenarios pass. No paid model or search calls made for this expansion; prior six-route live smoke is historical evidence, not a nine-route live verification. CI includes the new browser scenario; remote execution not verified.

Runtime now has nine provider routes and 23 tariff entries (17 existing + Wise holding + two Paysera categories + three bunq plans). Entries are not 23 interchangeable full-cost plans.

Existing sessions retain original route snapshots. Start a new Research session to load the expanded catalog. Human UAT still pending: verify usefulness, conditional-price comprehension and country-conflict interpretation. No deploy, commit, push or Devpost submission.
