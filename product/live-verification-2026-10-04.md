# Live verification — 4 October 2026

## Confirmed outcome

Real Tavily and Nebius Token Factory work locally. Model: `nvidia/nemotron-3-super-120b-a12b`. Final checks: 129/129 automated tests; 26/26 offline safety cases; keyless browser E2E passed; real-provider research browser E2E passed on local Chromium.

The final live evaluation examined 26 cases: 25 accepted real model responses, 25 expected final statuses, and 1 duplicate-ID input rejected before an API call. No unexpected failures, raw-model false-ready or final application false-ready. Four adversarial proposal cases deliberately inject proposals into the domain after the model call; those cases verify application defenses, not model generation of injected IDs. No claim of broad real-world accuracy follows from this small synthetic dataset.

Latency: p50 2343 ms, p95 3780 ms. Accepted responses reported 22182 total tokens in this final evaluation. Earlier diagnostic iterations and rejected responses are not included in that sum. Billed USD cost and current credit balance are unverified; hackathon $25 redemption is still unconfirmed. No paid top-up or billing change made.

## Workflow evidence

The live browser run searches both official bank domains, compares and explicitly reviews sources, supplies synthetic evidence metadata, analyzes both routes with real Nemotron, records a BPI ownership follow-up, edits its reply, approves BPI and downloads the approved server revision. Santander stays unapproved and downloads as a draft. Reload restores the approved snapshot. No bank received a response or application.

Both requirements versions reached 2. Route eligibility remains `check_directly`: replacing a source leaves old eligibility references stale until independently reviewed; BPI's channel is also not established. This is deliberately conservative. The reviewed source subset is documented in [source-review-2026-10-04.md](source-review-2026-10-04.md). The BPI session-specific profession requirement is explicitly reviewed; the global fixture is not silently generalized.

Artifacts under ignored `artifacts/`: live-evaluation-2026-10-04.json, live-browser-report.json, live-browser-analysis.json, live-browser-proposals.json, live-browser-sources-*.json, bpi-advanced-extract.json and live-research-desktop.png. Local API and public-source captures contain synthetic/public content only; keys stay exclusively in mode-0600 ignored `.env`.

## Repairs verified

- Restricted Tavily Search to server-owned official domain lists; BPI query now reaches its substantive checklist rather than relying on an incomplete landing-page extract.
- Bounded the model source excerpt and excluded repeated full-page bodies, which had caused timeouts and unstable matching.
- Added model-side JSON Schema cardinality/status constraints and independently computed allowed-evidence/source/applicability constraints. Original validator and domain gates remain active.
- Shared applicability evaluation between adapter and domain: confirmed conditions may match; unknown applicability remains blocked. Focused tests verify both states.
- Added sanitized numeric token usage and detailed live evaluation results, separating raw model decisions, final domain decisions, injection cases and input rejection.
- Added explicit opt-in `npm run test:browser:live` with isolated memory storage and synthetic input.

Initial live evaluation failed (18 accepted responses and 5 apparent false-ready results); evidence is retained as live-evaluation-initial-2026-10-04.json. Intermediate runs also exposed malformed/invalid responses, timeout and test-contract issues. The final pass above does not erase those diagnostics or prove deterministic reliability under repeated production use.

## Remaining gates

Full bank-policy/form coverage, explicit eligibility re-review UI, ownership-threshold/form reconciliation, broader semantic evaluation, current billing/credit confirmation, public-host browser verification and external user review remain open. No real-data pilot, commit/push, public deployment or Devpost submission performed.
