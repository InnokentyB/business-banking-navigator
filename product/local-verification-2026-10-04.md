# Local Mac verification — 4 October 2026 (Lisbon)

## Transfer and configuration

Archive: `~/Downloads/business-banking-navigator-2026-10-02.zip`; extracted to `~/Projects/business-banking-navigator`. Destination did not exist. Extraction rejects paths outside the destination and skips existing files. Original archive retained unchanged. README, TDPD, technical plan and acceptance ledger reviewed.

Node 24.6.0 / npm 11.5.1. `npm ci` succeeded; npm audit reported zero vulnerabilities. Playwright 1.62.1 and its official macOS ARM Chromium 151.0.7922.34 installed. Archive contains no Git history; local repository initialized on `main`, with no remote and no commits or push.

Private `.env` created from the example with mode 0600, empty provider keys and `HOST=127.0.0.1`. Git ignores `.env`, synthetic `data/` and `artifacts/`. Recognizable Tavily/private-key pattern scan found zero source findings; this is not an exhaustive secret audit.

## Verified result

- Original baseline: 121/121 tests; 26/26 offline cases; browser E2E passed on this Mac.
- After local changes: 123/123 tests; 26/26 offline cases; browser E2E passed again.
- Browser suite covers exports/print/history, follow-up and unsent reply recovery, two-window conflicts, evidence removal, source review, mobile layout and deletion. Captures: `artifacts/desktop.png`, `artifacts/mobile.png`.
- Running local server: `http://127.0.0.1:3000`, opened in external Google Chrome. `/health` returned ok; `/ready` reported single-process disk storage with both services unconfigured. Readiness is not live API success.
- `npm run preflight -- --require-live` and `npm run eval:live` exit 1 without keys, as expected; no live requests made.

## Technical plan continuation

ENG-05 preparation: explicit live evaluation now fails when its key is absent, and reports p50/p95 observed request latency (null when no requests run). Two CLI regression tests cover offline success and missing-key failure. Existing model/schema/false-ready checks remain intact; real semantic accuracy, usage/cost and latency are still unverified.

Local operation: `npm run start:local` loads `.env` and keeps synthetic sessions at `data/demo-state.json`; HOST configuration supports a loopback-only Mac demo. Hosting entrypoint `npm start` remains environment-driven. Added env-aware `preflight`, `smoke:live` and `eval:live` commands.

ENG-01 / remaining ENG-05 blocked on external access. External Chrome shows Tavily login; Nebius account presents billing setup requesting card details and service agreement. No card, agreement, account creation or new credential was submitted. Browser connector failed initialization; native Chrome UI was used instead. Cloud Browser was not used.

After owner access and local key entry: inspect available credits, run preflight and bounded live smoke, then 26-case live evaluation and the research source-review-to-model workflow. Record sanitized results only. Do not promote partial acceptance cases until those checks pass.

No public deployment, repository publication, remote CI or final Devpost submission performed. Those gates remain open. No real company data used.

## Provider access continuation

Tavily existing default dev key copied through external Chrome into the private local `.env` without exposing it in output. Preflight confirms Tavily configured, Nebius absent; `.env` remains mode 0600. Real Tavily smoke passed: 4 returned sources, 4 official BPI pages extracted, 7,658 ms; one unusable Search URL rejected as INVALID_URL. This verifies Search/Extract adapter access, not bank-policy correctness or the full reviewed research workflow. No model call yet.

Nebius account now shows trial $1 / 29 days. Hackathon $25 code activation and project credential creation still pending. Card verification was handed to the owner. No paid top-up or new key created by the agent.

Provider setup follow-up: the official Devpost kickoff still publishes NEBIUS-DEVPOST-GLOBAL26 for $25. Promo redemption could not be verified: native Chrome accessibility and visible screenshots disagree about field content; browser control then reports no available windows. Account balance increase is unconfirmed. No paid top-up performed. New Nebius key creation remains pending explicit action-time owner confirmation required by browser policy.

## Two-route Tavily verification

The running local research-mode API returned HTTP 200 and live-tavily for both routes. Santander: one extracted official candidate, 3,891 ms; BPI: one extracted official candidate, 1,550 ms; both eligible, no adapter errors. Public source payloads and sanitized summary are under ignored artifacts/. No candidate was approved and no saved requirements were replaced. BPI landing-page text is mostly document headings/links and footer, so underlying document coverage and policy correctness remain unverified.

Live smoke now checks each researched route against its own official domains and search query. Both pass: Santander 4,877 ms; BPI 3,402 ms. Nebius is explicitly skipped, not passed. Regression: 123/123 tests pass. Browser connection still fails and coordinate input reports no available windows; no new credential or paid top-up performed.

## Live provider update — 4 October 2026

Real Tavily/Token Factory access and the local research workflow are verified. Final result: 129 automated tests, 26 offline cases, keyless browser E2E and live research browser E2E pass. Live evaluation: 25 accepted real responses plus one safe pre-API duplicate-input rejection; zero raw/final false-ready, p50 2,343 ms, p95 3,780 ms. This closes the local provider-access/model-workflow gate only; policy completeness, eligibility re-review, billing/promo confirmation, public-host verification and real-data security remain open. Full evidence: [live-verification-2026-10-04.md](live-verification-2026-10-04.md).
