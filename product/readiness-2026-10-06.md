Current European expansion (2026-10-07): **nine provider routes, 23 partial tariff entries; 165 automated tests and 26 offline cases**. Wise, Paysera and bunq added; company acceptance remains conditional. See [expansion evidence and limitations](european-expansion-2026-10-07.md).

# Business Banking Navigator · readiness · 6 October 2026

The local synthetic demonstration now covers banking needs → explained options → a chosen route → comparison export → source review → document preparation → draft/approved checklist and follow-up. It is ready for a founder usability walkthrough. It is not ready for real company documents or a public launch.

## Implemented

- Essential coverage sorts before preferences, with explicit ties and unknowns; price cannot compensate for an unsupported essential need.
- Compact legal-form/goal entry with optional essential requirements and volume details, saved needs and stale-result handling.
- Six runtime routes: Santander, BPI, CGD, novobanco, Qonto and Revolut Business. The wider 14-provider research catalog is not equivalent to runtime coverage.
- Seventeen published tariff options across six providers. Monthly/annual billing and taxes are preserved. BPI/novobanco discounts require conditions and are not silently applied; CGD maintenance figures include stamp duty. Santander prices are shown before its 4% stamp duty. Revolut tax treatment requires confirmation.
- Qonto SEPA/direct-debit partial calculator; unknown usage differs from zero. No complete FX/transaction comparison or cheapest-bank ranking.
- Evidence-backed Revolut currency balances and Revolut/Qonto team cards. Most other operational capabilities, exact currencies and product-specific allowances remain to be completed.
- Current comparison download and printable report, with revision, needs, choice, source dates, partial costs and open questions. Draft/stale decisions cannot be exported as current.
- Real inference uses per-group constraints, per-requirement output schema, a bounded response budget and Nemotron thinking disabled for metadata matching. Identity contradictions cannot be hidden by model omission. Invalid responses still fail safely; no automatic paid retry loop.
- CI configuration now includes all six keyless browser scenarios. No remote CI run is claimed.

## Verification

163 automated tests pass; 26/26 offline safety cases pass. Six keyless browser scenarios pass: full preparation workflow, route comparison, needs selection, compact UX, tariffs and comparison export. Desktop/mobile screenshots inspected; the printable report's mobile overflow was fixed. The design detector is degraded to regex checks because optional parser packages are missing; computed contrast was not verified.

Real six-route browser E2E passes with Tavily and Token Factory, preserving conditional/scope review. The final live evaluation accepted 25 valid responses, rejected duplicate input before API call, matched all 25 expected final outcomes and recorded zero raw/final false-ready outcomes. p50 793 ms; p95 1,161 ms; 15,828 reported tokens for that evaluation. Billing/promo redemption is not verified. Earlier failing runs are retained as diagnostic history.

Evidence: `artifacts/readiness-final-unit.txt`, `readiness-final-offline.txt`, `readiness-final-*.txt`, `decision-browser-green.txt`, `readiness-six-route-live-browser.txt`, `reliability-live-evaluation-final.txt`. Sample synthetic report: `artifacts/sample-banking-comparison.pdf`.

Secret scan: both provider keys configured; zero copies outside local `.env`, including ignored artifacts. Keys were not displayed. No commit, push, remote CI run, public deployment, bank application or Devpost submission.

## Remaining gates, in order

| Gate | What remains | Completion evidence |
| --- | --- | --- |
| Founder usability | Observe needs entry, explain one relevant option, distinguish partial cost/eligibility/readiness, choose next action and save report | Two recorded synthetic walkthrough verdicts; revise on confusion |
| Product usefulness | Five recent founder/adviser bank-choice cases; first segment and success criteria remain hypotheses | Observed problems/alternatives, counterexamples and product decision |
| Coverage | Bank/product identifiers, eligibility, supported currencies, local reference/tax payments, IBAN and operational capabilities; full route checklists and Qonto ownership threshold conflict | Current product-scoped official sources with review/freshness and conflict decisions |
| Cost scope | Separate transfer types, amounts, FX, taxes, cards/users, one-off fees and discount qualification; estimates comparable only where coverage matches | Boundary/sensitivity cases and explicit unknown components |
| Experience evidence | Define lawful review sources; segment country/business/product/date, deduplicate and show limited experience independently of bank policy | Source/access protocol and reviewed samples; no ungrounded numeric rating |
| Repository/release | Choose repository and public host, review limits/persistence/rollback; public-host browser QA | Owner decision and actual remote CI/public-host results |
| Real-data pilot | Authentication, tenant permissions, secure files, retention and consent | Security acceptance before real documents |
| Submission | Updated rehearsal is prepared; video/public URLs and final submission remain pending | Separate owner decision |

Customer validation kit and new demo/submission drafts are updated; no invitations or other messages have been sent. These human/access/release gates are not replaced by passing automated tests.

## Opening the current catalog

The local server is running at http://127.0.0.1:3000/. Existing sessions retain their original route snapshots. To see Revolut alongside the five previous routes, select Research sources and use Session controls → Start new session. Old decisions also require reassessment after changed published facts. No old session was deleted or silently migrated.

## Official pricing references

- Qonto: https://qonto.com/pt/pricing
- BPI: https://www.bancobpi.pt/empresas/contas-valor-bpi-negocios
- CGD: https://www.cgd.pt/Empresas/Pages/Empresas_V2.aspx
- Santander: https://www.santander.pt/empresas/abrir-conta-empresas-online
- Revolut: https://www.revolut.com/en-PT/business/business-account-plans/
- novobanco: https://www.novobanco.pt/content/dam/novobancopublicsites/docs/pdfs/precario/particulares/PRE-FC.pdf.coredownload.inline.pdf

novobanco's historical EUR 12.50 is superseded by its documented 19 January 2024 change to EUR 13.95, corroborated by the current product page and fee sheet: https://www.novobanco.pt/content/dam/novobancopublicsites/docs/pdfs/precario/particulares/NB%20Altera%C3%A7%C3%B5es%20de%20Pre%C3%A7%C3%A1rio%202024%20Outros%20Clientes.pdf.coredownload.inline.pdf . Conditional rebates are not applied.
