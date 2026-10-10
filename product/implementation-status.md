# TDPD implementation status — 2026-10-02

> Новая цель от 6 октября 2026: подбор банковского обслуживания под задачи бизнеса. Актуальный план и аудит: [TDPD-selection-2026-10-06.md](TDPD-selection-2026-10-06.md). Прежние требования/сценарии/TC ниже сохраняются для подготовки документов; они не подтверждают готовность подбора.
The application now has a coherent synthetic server workflow, not merely client snapshots. Verification scope is in `acceptance-status.md`: 121 automated tests pass and 26 offline safety-evaluation cases pass. Neither is a claim that all 64 TDPD cases or real-model accuracy are verified.

| Capability | Current evidence and boundary |
| --- | --- |
| Two fictional routes and reusable synthetic profile | Domain and server tests; incomplete/conflicting evidence cannot be approved. |
| Santander/BPI research mode | Saved partial official-page selection dated 2 Oct; online Santander restriction scoped to channel, BPI channel unknown. |
| Source-to-package workflow | Tavily adapter → candidate/domain filter → explicit requirement review → version/invalidation → model receives source snapshot. Server contract checked with mocked network; actual Tavily not run. |
| Nemotron 3 Super / Token Factory | Configurable model, JSON/ID/coverage/evidence guards, response-body timeout, sanitized errors; actual key not available. |
| Server snapshots/approval/export | Session-owned current packages, revision conflicts, stable replay, server-generated approved exports; client snapshot approval rejected. |
| Follow-up | Human-classified 1–5 request items, per-item evidence, owner/identity/expiry checks, scoped revisions, pending requests survive reanalysis. No bank transport. |
| Persistence/recovery | Optional single-process atomic JSON file, restart/failure tests, bounded history, 24h TTL/access cleanup and synthetic session deletion. No customer-grade auth/database. |
| UI | Business source-review rows, visible dates/modes/partial scope, manual request classification, session/local reply resume; syntax and HTTP contract checked. Browser E2E passes locally on Chromium 153, including desktop/mobile captures; public-host browser QA pending. |
| Deployment preparation | MIT root license, English README, non-root Dockerfile/compose, runbook, live smoke, pinned development dependencies, CI and a passing local browser suite. Docker unavailable here; host/public URL/repo not provisioned. |

## External dependencies

- Nebius project key/credits and model access; Tavily key/credits. Both absent from this environment.
- Browser QA now passes through a temporary npm-bundled Chromium fallback. Public deployment still needs its own browser smoke.
- Hosting/repository accounts or destinations: no configured remote or deployment credentials; no public URL created.
- Founder/accountant interviews and prototype review: no demand/ROI claim is established by this code.
- Final Devpost submission: separate owner decision required.

## Remaining autonomous work after dependencies are supplied

Run live smoke and held-out-style model evaluation, repair prompt/contracts if needed; repeat browser/mobile QA on the public host; deploy to the chosen host and verify public research/runtime path; publish repository and validate clean start; record final video and complete the draft submission from actual measured results. Do not label these completed yet.

## Real-data pilot boundary

No real PDF upload, OCR, tenant authentication, encrypted client file store, backup retention policy or banking integration. TC-59–61 need customer-grade implementation before using real business documents. Synthetic session tokens are bearer capabilities, not identity verification or user authentication.

## Additional keyless progress

AND-composite published requirements require every evidence group; address contradictions stay uncertain. Printable export escapes input text and carries sources/approval. Package history is visible, evidence can be removed, draft replies are bound to package revision, and new bank requests preserve prior obligations. CI configuration is checked in; no remote CI execution or public deployment is claimed.

## Local Mac update — 4 October 2026

Baseline reproduced locally: 121 tests, 26 offline cases and browser E2E. After local setup and live evaluation gate improvements: 123 tests, 26 offline cases and browser E2E pass. ENG-01 live access and ENG-05 real-model verification remain pending; no public deployment or submission. Evidence and next steps: [local-verification-2026-10-04.md](local-verification-2026-10-04.md).

## Live provider update — 4 October 2026

Real Tavily/Token Factory access and the local research workflow are verified. Final result: 129 automated tests, 26 offline cases, keyless browser E2E and live research browser E2E pass. Live evaluation: 25 accepted real responses plus one safe pre-API duplicate-input rejection; zero raw/final false-ready, p50 2,343 ms, p95 3,780 ms. This closes the local provider-access/model-workflow gate only; policy completeness, eligibility re-review, billing/promo confirmation, public-host verification and real-data security remain open. Full evidence: [live-verification-2026-10-04.md](live-verification-2026-10-04.md).

## Расширение банков — 4 октября 2026

Подключены частичные CGD branch, novobanco Lda (канал unknown), Qonto Lda online; всего 5 исследовательских маршрутов. 133 автоматических теста, 26 прежних офлайн-кейсов, keyless и повторный live browser E2E прошли; Search/Extract smoke успешен для всех пяти. Новые маршруты сохраняют открытый review, конфликт Qonto 5% не разрешён. Полный протокол и ограничения: [bank-expansion-2026-10-04.md](bank-expansion-2026-10-04.md).

## Первый срез банковских потребностей — 6 октября 2026

Анкета, deterministic mandatory/preferences assessment, explanations/questions, server decision versions и handoff в подготовку реализованы в узком PT Lda scope. 139 tests, selection/browser/comparison E2E и 26 прежних offline cases проходят. Полная capability/fee/review база и human UAT не закрыты; прежние TC не доказывают качество ranking. Протокол: [selection-slice-2026-10-06.md](selection-slice-2026-10-06.md).
