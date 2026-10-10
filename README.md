Current European expansion (2026-10-07): **nine provider routes, 23 partial tariff entries; 165 automated tests and 26 offline cases**. Wise, Paysera and bunq added; company acceptance remains conditional. See [expansion evidence and limitations](product/european-expansion-2026-10-07.md).

> Current readiness, 6 October 2026: 163 tests, 26 offline cases, six keyless browser journeys, six-route live E2E and a passing 26-case live evaluation. Six providers and seventeen published tariff options are partial coverage. See [readiness-2026-10-06.md](product/readiness-2026-10-06.md). Human acceptance, full capability/cost coverage, real-data security and public release remain open.

# Business Banking Navigator

An SME workspace for reusing one company profile across distinct banking checklists, reviewing dated public sources, and responding to later bank requests. Built for the Nebius × NVIDIA Global AI Hackathon. **Only synthetic company data is accepted. No bank application is sent and checklist approval is not a bank decision.**

## Run

Node.js 24 recommended (runtime APIs require Node 20+); no runtime package installation needed.

```bash
npm ci
npm test
npm start
```

Open `http://localhost:3000`. The default scenario is fictional. The research mode uses a **partial**, saved 2–4 October 2026 selection of official Santander, BPI, CGD, novobanco and Qonto pages with a synthetic company. Santander's online participant limitation is channel-specific. BPI's submission channel and full eligibility are not established. Neither mode proves market demand or bank acceptance.

Optional server configuration:

```bash
cp .env.example .env
# Fill keys locally, never commit them.
node --env-file=.env app/server.mjs
node --env-file=.env scripts/config-preflight.mjs --require-live
node --env-file=.env scripts/live-smoke.mjs --require-live
```

`NEBIUS_API_KEY` enables Nemotron 3 Super through Nebius Token Factory. `NEBIUS_MODEL` overrides the default `nvidia/nemotron-3-super-120b-a12b`. `TAVILY_API_KEY` enables public Search/Extract. Keys stay on the server. Without Tavily, refresh explicitly returns saved sources with their original dates. Without Nebius, analysis is deterministic and clearly marked. Configured service failures never create a false successful analysis.

## Reproducible demo

1. Load the fictional scenario, inspect the company/evidence, then analyze both routes. A has missing/uncertain items; B's published checklist is ready.
2. Download A's **draft**. Select B, explicitly approve it, and export the server's approved snapshot.
3. Add a synthetic ownership chart (owners match the profile). Select B for the example follow-up, prepare the response, review/edit it, then approve the new revision. Nothing is sent to a bank.
4. Refresh B's sources. The saved fallback is dated, never labelled live. Review the candidate and its requirements; approval creates a new requirements version and makes only the affected package stale. Reanalyze before export.
5. Switch to research mode to see the online Santander constraint separately from BPI's documentation and unknown channel. The checklist is partial; add synthetic evidence and review conditional applicability, rather than assuming the bank will accept the company.

The app resumes a synthetic session on refresh. Submitted request attachments and versioned packages are saved server-side; unsent edited reply text is stored locally in that browser. The export area also provides a printable, source-attributed checklist (browser Print → PDF), and each package exposes its immutable revision history. Session links act as bearer capabilities for **synthetic demo data**, not authentication for real customers. Do not enter real names, IDs or documents.

## Architecture

- `app/server.mjs`: server-owned routes/packages, per-session API, optimistic revisions, idempotent commands, rate limits, security headers and server exports.
- `app/store.mjs`: TTL sessions, immutable snapshot history, events, optional atomic single-process disk persistence. Each session has bounded history.
- `app/sources.mjs`: official-domain filtering, content snapshots, explicit source/requirement review, stale-source handling. Search results cannot silently replace rules.
- `app/domain.mjs`: deterministic applicability, source/evidence matching, route eligibility and follow-up revisions. Model uncertainty is preserved; an unsupported online route cannot be approved.
- `app/adapters.mjs`: Tavily Search/Extract and NVIDIA Nemotron on Token Factory, timeouts, strict IDs/coverage and bounded semantic evidence checks.
- `app/public/`: user interface for comparison, readable source review, explicit request scope and approval.

Runtime chain: Tavily candidate → human review → versioned route requirements → Nemotron proposals → deterministic validation → package/follow-up → explicit approval → server export. Source text is untrusted data, not instructions. Code validates IDs/type/subject/expiry; it cannot independently prove every textual claim or factual interpretation.

## Tests and known boundaries

```bash
npm test
npm run smoke:live
# Optional real-browser suite, after installing Playwright + Chromium:
npm run test:browser
```

Tests include mocked service contracts, source review/invalidation, replay and concurrency, persistence failure/restart, evidence conflicts and partial research route limits. `product/acceptance-status.md` separates covered and unverified acceptance cases. A green suite does not mean all 64 product cases are complete. Live smoke fails its readiness gate when required keys are absent. The keyless browser suite has passed locally using Chromium 153, including session/reply recovery, two-window conflicts, evidence removal, source review, history, print, mobile layout and deletion. Consult `deployment/RUNBOOK.md` for browser installation.

## Deployment

Use `Dockerfile` or a Node 24 host behind HTTPS. `deployment/compose.yaml` runs locally with an optional persistent volume. `DATA_FILE` is optional; without it server restarts expire all synthetic sessions. **One process only** for the JSON store; use a database before multiple instances. TTL is 24 hours with expiry cleanup on access/creation/startup; no backups are created by the app. Hosting providers may retain volume backups independently. Public URLs, repository publication and continuous availability through judging are not configured in this checkout.

`GET /health` reports process liveness. `GET /ready` reports key configuration booleans and storage mode, not API success. Logs contain request ID, method, status and latency only. The default IP budget is 120 requests/minute and 10 analysis/refresh requests/minute; it uses the socket address, not untrusted forwarded headers. Place a provider-level rate limiter in front of the service for a public launch, especially behind a shared proxy.

## Product documentation

`product/TDPD.md`, `user-scenarios.md`, `test-cases.md`, `technical-plan-2026-10.md`, `submission-plan-2026-10.md`, `implementation-status.md`, `bank-source-research.md` and `acceptance-status.md` describe scope, risks, validation and remaining work.

Before any real-company pilot: authentication/roles, tenant isolation, secure document ingestion, encryption, retention/deletion and audit controls must be implemented and reviewed. PDF ingestion, automatic banking submission and country-wide policy coverage are outside the synthetic demo.

## License

Code is MIT licensed; see `LICENSE`. Bank pages remain the property of their publishers. Brief research excerpts are attributed by URL and retrieval date. Final hackathon submission requires the project owner's separate decision.

## Local Mac checkout (4 October 2026)

In `~/Projects/business-banking-navigator`, run `npm run start:local` to load the private `.env`, bind to `127.0.0.1:3000`, and persist synthetic sessions in `data/demo-state.json`. `npm start` retains the environment-only hosting entrypoint. Run `npm run preflight -- --require-live` before `npm run smoke:live` and `npm run eval:live`; the live evaluation exits unsuccessfully without a key and reports p50/p95 request latency. API readiness remains unverified until actual requests pass. See `product/local-verification-2026-10-04.md`.

The live smoke checks all five researched routes using each route’s official domains. A passing source check confirms Search/Extract access only; it does not approve candidates or establish a complete bank checklist. `--require-live` also requires the Nebius check to pass.

### Live research workflow verification

`npm run test:browser:live` explicitly runs local Chromium against an isolated in-memory server using both real providers. It consumes API credits and uses only synthetic metadata. The scenario reviews official source candidates, analyzes all five routes with Nemotron, keeps Santander unapproved, exercises BPI follow-up/approval/export, and checks restoration. Reports and screenshots are saved under ignored `artifacts/`. Review choices apply only to that synthetic session; source coverage and bank-channel eligibility remain partial.

Inference uses JSON Schema output constraints, bounded source excerpts and server-computed evidence/applicability constraints; the independent validator and domain still determine whether an output is usable. Live evaluation reports raw-model false-ready separately from final application false-ready, records token usage when available, and identifies proposal-injection cases and the duplicate-ID input gate. Token counts do not confirm billed cost or promo redemption.

### Expanded Portugal research routes — 4 October 2026

Start a **new research session** to load CGD branch documentation, novobanco Lda documentation (channel unknown) and Qonto Lda online alongside Santander/BPI. Existing sessions retain their saved route versions. New routes are partial and keep unresolved scope/document conditions open; adding a synthetic document does not resolve date, certification, participant coverage or legal-form applicability. Qonto shareholder wording differs at exactly 5%, so that requirement stays uncertain until reviewed. See `product/bank-expansion-2026-10-04.md`.

### Route comparison

Choose the banks to analyze using “Include in comparison”. The first two routes are selected in a new session; your selection is remembered locally for that session. Empty selection disables analysis. The comparison shows channel, missing documents, review items and eligibility caveats; unsaved profile/evidence changes mark results as needing reanalysis. Requirements and package items expand on request. Export/follow-up selectors offer routes with prepared packages. Run `npm run test:browser:comparison` for the selection/restoration/mobile checks.

### Banking-needs assessment (initial slice)

Describe your synthetic company needs, save a draft or assess options. Mandatory unsupported conditions exclude a route; unknown support or eligibility is shown separately for confirmation. Confirmed preferences have equal weight and ties remain explicit. This is not a fee/review comparison. The minimal source baseline establishes opening channels only; other capabilities remain unknown. Needs, decisions and choices persist in the server session; source/profile changes require reassessment. Run `npm run test:browser:selection`. Details: `product/selection-slice-2026-10-06.md`.


## Guided UX · 2026-10-06

The entry screen now starts with legal form and five banking goals. Detailed requirements, company/evidence fields, preparation and follow-up use progressive disclosure. Choosing an option opens preparation. See `product/guided-ux-2026-10-06.md`; browser coverage: `npm run test:browser:guided`. Capability/pricing coverage and human usability acceptance remain open.


## Published cost baseline · 2026-10-06

Qonto PT annual Basic/Smart/Premium tariffs now expose annual upfront subscription, monthly equivalent, included SEPA/direct-debit operations and excess-unit fees. A separate optional SEPA count drives partial subtotals; existing generic payment volume is not substituted. VAT, FX, international payments, cards/team users and other charges remain outside the subtotal. Confirmed product-level team-card support now participates in needs matching; plan costs remain separate. Other providers have unknown price coverage. Fees do not rank banks. See `product/tariff-slice-2026-10-06.md`; `npm run test:browser:tariffs`. Verified: 144 automated tests, 26 offline cases and five keyless browser workflows. SEL tariff/capability tasks are partially covered; full catalog, FX calculations, reviews and human acceptance remain open.
