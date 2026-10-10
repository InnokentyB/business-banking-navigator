Current European expansion (2026-10-07): **nine provider routes, 23 partial tariff entries; 165 automated tests and 26 offline cases**. Wise, Paysera and bunq added; company acceptance remains conditional. See [expansion evidence and limitations](european-expansion-2026-10-07.md).

> Current readiness, 6 October 2026: 163 tests, 26 offline cases, six keyless browser journeys, six-route live E2E and a passing 26-case live evaluation. Six providers and seventeen published tariff options are partial coverage. See [readiness-2026-10-06.md](readiness-2026-10-06.md). Human acceptance, full capability/cost coverage, real-data security and public release remain open.

# Acceptance verification — 2 October 2026

> Новая цель от 6 октября 2026: подбор банковского обслуживания под задачи бизнеса. Актуальный план и аудит: [TDPD-selection-2026-10-06.md](TDPD-selection-2026-10-06.md). Прежние требования/сценарии/TC ниже сохраняются для подготовки документов; они не подтверждают готовность подбора.
This ledger records verification scope, not a claim that all 64 acceptance cases pass. `npm test` currently executes 121 adapter/domain/server tests. The offline evaluation dataset has 26 safety scenarios; it does not measure real-model accuracy. Keyless browser E2E passes locally on Chromium 153 (npm-bundled fallback after a failed CDN install), including print/download, reply/session restore, two-window conflict, evidence removal, manual compound classification, source review, history, deletion and mobile layout. Real Tavily/Token Factory calls are blocked by missing keys.

Status definitions: **automated slice** = implemented risk checked at API/domain level, while the full user-facing acceptance may require E2E/live validation; **partial** = important variants remain absent; **deferred** = outside synthetic demo or not implemented. No row is promoted to full acceptance solely from its TC tag in a unit test.

| TC | Status | Evidence / remaining boundary |
| --- | --- | --- |
| 01 | automated slice | Server and browser reuse one profile across two packages. |
| 02 | automated slice | Distinct route requirements/evidence IDs; desktop and mobile display checked. |
| 03 | automated slice | Missing proof and conditional unknown remain visible and block approval. |
| 04 | partial | Real Tavily Search/Extract passed for both route landing pages on 4 October; underlying linked documents and policy completeness remain unverified. |
| 05 | automated slice | Santander participant criteria scoped to online route, no bank-wide rejection. |
| 06 | partial | Validated mocked model invocation; real Nemotron semantics unverified. |
| 07 | partial | Requirement/evidence/source links displayed and browser-checked; external user review pending. |
| 08 | automated slice | Invented IDs/status/source rejected; arbitrary citation wording not proved. |
| 09 | automated slice | Provider outage/missing key produces original-dated saved fallback, not fresh. |
| 10 | partial | Explicit conflict/stale flags produce uncertain; automatic contradiction detection between pages absent. |
| 11 | automated slice | Scoped follow-up revision/evidence/response; other route unaffected. |
| 12 | automated slice | Contradictory owner/profile evidence makes follow-up uncertain. |
| 13 | automated slice | Server approval and authoritative approved export; no bank submission. |
| 14 | automated slice | Shared input revision invalidates packages; browser editing/removal path checked. |
| 15 | automated slice | Model JSON/HTTP/timeout fail without replacing prior snapshots; real failures unverified. |
| 16 | automated slice | Session resume, command replay and server/browser recovery pass. |
| 17 | automated slice | Incomplete profile rejected before analysis/approval; draft incomplete-profile storage absent. |
| 18 | partial | Company/address contradiction checked; manual address origin stored, explicit conflict resolution workflow absent. |
| 19 | automated slice | Removing shared evidence changes both relevant results; physical files absent. |
| 20 | automated slice | Independent second evidence retains matched status. |
| 21 | deferred | PDF upload/parsing unsupported; synthetic metadata only. |
| 22 | deferred | OCR/image review and extraction confidence unsupported. |
| 23 | automated slice | Person-specific evidence cannot satisfy another subject. |
| 24 | deferred | Ownership-chain discovery/resolution unsupported. |
| 25 | automated slice | Old snapshot immutable; new snapshot unapproved/stale when recalculated. |
| 26 | deferred | Byte-level document deduplication unsupported. |
| 27 | automated slice | Official-domain filter rejects third-party candidate approval. |
| 28 | partial | Mismatched Extract URL rejected; same-domain wrong channel still needs human review. |
| 29 | partial | Empty Extract/search errors covered; arbitrary login-wall detection not implemented. |
| 30 | automated slice | Source review creates version, marks affected snapshot stale and blocks export. |
| 31 | automated slice | Unknown conditional applicability remains uncertain. |
| 32 | automated slice | Missing participant facts require direct route check. |
| 33 | partial | Separate channel scope preserved; automatic split of mixed-channel pages absent. |
| 34 | partial | Identical URL deduplication checked; canonical aliases/redirect deduplication absent. |
| 35 | partial | Stale/unavailable flags and saved-dated fallback checked; real 404 path not run. |
| 36 | automated slice | Injection text kept as data; schema/domain gates checked, live adversarial model unverified. |
| 37 | automated slice | Subject/entity/company identification conflicts cannot yield ready. |
| 38 | automated slice | Expired/invalid-date evidence rejected in core and adapter. |
| 39 | automated slice | AND-composite published requirements supported: every group needed; alternatives within a group allowed. |
| 40 | partial | Wrong existing source ID blocked; textual quote relevance beyond ID not automatically proved. |
| 41 | automated slice | Missing/duplicate model item rejected; requirements cannot silently disappear. |
| 42 | automated slice | Unverified exclusion rejected; independent verified fact needed. |
| 43 | automated slice | In-flight analysis cannot overwrite a newer source/input/package revision. |
| 44 | automated slice | Concurrent same-key analysis/retry yields one result and one model call. |
| 45 | automated slice | Draft export retains open items and explicit draft label. |
| 46 | automated slice | Route-scoped conditions/provenance differ; desktop/mobile comparison visible. |
| 47 | automated slice | Cross-route follow-up rejected. |
| 48 | automated slice | Human-classified compound request has separately checked items; no claim of automatic NLP classification. |
| 49 | automated slice | Idempotent replay and duplicate same request are explicit; no new hidden obligation. |
| 50 | automated slice | Follow-up origin scoped to package; not published as bank policy. |
| 51 | automated slice | Browser-edited response appears exactly in approved downloaded snapshot. |
| 52 | automated slice | New evidence/request revision drops old approval; historical snapshot retained. |
| 53 | automated slice | Server session/request and unsent revision-bound reply restore pass in browser. |
| 54 | deferred | External bank decision/outcome timeline unsupported. |
| 55 | automated slice | Partial Extract/error reports and failed model preserve previous results. |
| 56 | automated slice | Stable command key replay checked; actual browser transport timeout unrun. |
| 57 | automated slice | Simulated persistence failure rolls approval back; restart retains successful state. |
| 58 | automated slice | Two-window browser conflict and reload checked; side-by-side conflict comparison absent. |
| 59 | partial | Cross-session capability isolation checked; customer auth/tenant security still blocks real pilot. |
| 60 | partial | Server export scoped to session/package, secrets excluded; real-client isolation not implemented. |
| 61 | partial | Synthetic session DELETE/TTL access cleanup implemented; provider backups/real retention policy absent. |
| 62 | automated slice | Missing/invalid-key states sanitized; real credentials/limits unverified. |
| 63 | automated slice | Untrusted input has no bank transport/tool privilege; actual adversarial model not evaluated live. |
| 64 | partial | Replays/conflicts, browser reload and approved redownload checked; actual provider slowness unverified. |

## Open gates

1. Run real runtime smoke and 26-case model evaluation after keys are configured; record latency, schema validity and false-ready decisions.
2. Repeat the passing local browser E2E and layout checks on the eventual public host.
3. Run official two-route source review through live Tavily and the live model. Reviewed fixture coverage is partial, not a full bank checklist.
4. Keep original TDPD cases intact: deferred capabilities above are explicit scope gaps, not completed cases. Before a real-data pilot, implement secure file handling, authentication, tenant access and retention.

## Local Mac update — 4 October 2026

Baseline reproduced locally: 121 tests, 26 offline cases and browser E2E. After local setup and live evaluation gate improvements: 123 tests, 26 offline cases and browser E2E pass. ENG-01 live access and ENG-05 real-model verification remain pending; no public deployment or submission. Evidence and next steps: [local-verification-2026-10-04.md](local-verification-2026-10-04.md).

## Live provider update — 4 October 2026

Real Tavily/Token Factory access and the local research workflow are verified. Final result: 129 automated tests, 26 offline cases, keyless browser E2E and live research browser E2E pass. Live evaluation: 25 accepted real responses plus one safe pre-API duplicate-input rejection; zero raw/final false-ready, p50 2,343 ms, p95 3,780 ms. This closes the local provider-access/model-workflow gate only; policy completeness, eligibility re-review, billing/promo confirmation, public-host verification and real-data security remain open. Full evidence: [live-verification-2026-10-04.md](live-verification-2026-10-04.md).

## Расширение банков — 4 октября 2026

Подключены частичные CGD branch, novobanco Lda (канал unknown), Qonto Lda online; всего 5 исследовательских маршрутов. 133 автоматических теста, 26 прежних офлайн-кейсов, keyless и повторный live browser E2E прошли; Search/Extract smoke успешен для всех пяти. Новые маршруты сохраняют открытый review, конфликт Qonto 5% не разрешён. Полный протокол и ограничения: [bank-expansion-2026-10-04.md](bank-expansion-2026-10-04.md).

## Первый срез банковских потребностей — 6 октября 2026

Анкета, deterministic mandatory/preferences assessment, explanations/questions, server decision versions и handoff в подготовку реализованы в узком PT Lda scope. 139 tests, selection/browser/comparison E2E и 26 прежних offline cases проходят. Полная capability/fee/review база и human UAT не закрыты; прежние TC не доказывают качество ranking. Протокол: [selection-slice-2026-10-06.md](selection-slice-2026-10-06.md).


## Guided UX · 2026-10-06

The entry screen now starts with legal form and five banking goals. Detailed requirements, company/evidence fields, preparation and follow-up use progressive disclosure. Choosing an option opens preparation. See `product/guided-ux-2026-10-06.md`; browser coverage: `npm run test:browser:guided`. Capability/pricing coverage and human usability acceptance remain open.


## Published cost baseline · 2026-10-06

Qonto PT annual Basic/Smart/Premium tariffs now expose annual upfront subscription, monthly equivalent, included SEPA/direct-debit operations and excess-unit fees. A separate optional SEPA count drives partial subtotals; existing generic payment volume is not substituted. VAT, FX, international payments, cards/team users and other charges remain outside the subtotal. Confirmed product-level team-card support now participates in needs matching; plan costs remain separate. Other providers have unknown price coverage. Fees do not rank banks. See `product/tariff-slice-2026-10-06.md`; `npm run test:browser:tariffs`. Verified: 144 automated tests, 26 offline cases and five keyless browser workflows. SEL tariff/capability tasks are partially covered; full catalog, FX calculations, reviews and human acceptance remain open.
