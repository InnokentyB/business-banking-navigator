# Published tariffs and capabilities · acceptance plan

Scope: Qonto PT Basic, Smart and Premium annual billing plans; source-backed team-card capability. Other routes retain unknown tariff coverage. Fees do not rank providers.

Inputs: a new optional `monthlySepaPayments` count, specifically outgoing SEPA transfers plus direct debits. Existing general payment count is retained and never silently treated as SEPA usage. Unknown differs from zero. Existing saved needs migrate by defaulting the new field to null.

Output: known monthly equivalent subtotal (annual subscription divided by twelve plus overage for a monthly SEPA/direct-debit scenario), annual upfront subscription, allowance, excess unit fee, source and date. Explicit exclusions: VAT, FX/international payments, cards/team users and other charges. No full-cost promise, no cheapest-bank claim, no promotions.

Must-have tests before implementation:
- 0 and included-limit usage charge no excess; limit+1 charges one unit; Basic/Smart/Premium boundaries 30/100/200.
- Unknown usage leaves variable fees unknown; general payment count is not substituted.
- Invalid, negative, fractional, string and excessive counts rejected; saved older needs accepted.
- Expired/unavailable/conflicting sources suppress estimates; unsupported legal form/country suppresses PT Lda estimates.
- Team cards supported only with current explicit evidence; no multi-currency inference from international transfer marketing.
- Browser input produces annual commitment and partial subtotal; dirty inputs hide old estimates; reload preserves count; mobile remains within viewport.

Sources verified 2026-10-06: https://qonto.com/pt/pricing (annual terms, allowances and excess fees); https://support-pt.qonto.com/hc/pt/articles/30637080795537-Como-posso-pedir-o-meu-cart%C3%A3o-Qonto (team card ordering requires invitation/identity verification). Product-level team-card support does not mean all plan/user/card costs are included.

Human usability acceptance and complete bank tariff coverage remain open. No public deployment or submission.

## Implemented and verified

`app/published-offers.mjs` stores the reviewed facts. Server selection emits per-plan partial estimates with integer-cent arithmetic and a 30-day evidence gate. The versioned decision baseline includes offer data and evidence freshness, so older decisions require reassessment. The existing eligibility and ranking rules remain unchanged.

RED evidence: `artifacts/tariffs-red.txt` and `artifacts/tariffs-browser-red.txt`. GREEN: 144/144 automated tests, 26/26 offline cases, five keyless browser workflows (full workflow, route comparison, selection, guided UX, tariffs). No live provider request in this slice; previous inference regression remains open.

No commit, push, public deployment, bank submission or billing change.
