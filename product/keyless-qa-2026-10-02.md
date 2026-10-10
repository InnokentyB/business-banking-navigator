# Keyless progress and QA — 2 October 2026

**Actual result:** 121 unit/API/adapter tests pass; 26 offline safety-evaluation cases pass; the browser E2E passes locally on Chromium 153. The build uses synthetic companies and does not call Tavily or Token Factory without keys. Offline results do not measure model accuracy.

## Product improvements

- All evidence groups in a published compound requirement must be satisfied; a partial match cannot become ready.
- Conflicting company addresses are uncertain. Evidence removal marks packages for recalculation.
- Source-attributed printable checklists support browser Print/Save PDF, with correct draft/approved labels and escaped input text.
- Immutable package versions are visible in history. Approved downloads remain available after reload and retain their approved filename.
- Draft reply storage is bound to the current package revision. Approval selects the response for the correct route.
- New requests preserve older obligations; human classification replaces only the selected request's scope.
- Session reload resolves stale-window state. Synthetic session deletion is exposed in the UI.
- Playwright is pinned with a lockfile. Prepared GitHub CI runs clean installation, unit tests, offline evaluation and Chromium E2E. No remote execution is claimed.

## Browser checks performed

Fictional fixture → distinct packages → draft download → approved download/re-download → printable output → follow-up → edited reply restored after page reload → exact approved text in downloaded JSON → historical revisions → second-window input conflict and saved-session reload → evidence removal blocks readiness → research mode with partial coverage and channel caveat → source approval invalidates package → reanalysis → 390px no horizontal overflow → synthetic session deletion → manual classification of ownership/address request.

No browser JavaScript errors occurred in the checked page. Desktop and mobile captures were visually reviewed. This is developer QA, not a founder/accountant usability study.

## Remaining dependencies

Actual Nebius/Tavily calls and live model evaluation need server keys. Public hosting/repository publication need configured destinations and accounts. Interviews need real respondents. Full PDF/OCR ingestion, ownership-chain reasoning, external bank-outcome tracking and customer-grade authentication/storage remain explicit scope gaps. Final Devpost submission still requires a separate owner decision.

## Parallel hardening completed

- Source refresh compares with the latest active publication, preserving historical stale versions.
- Replaying an earlier follow-up after another request is recognized as a duplicate. Evidence without an ID cannot support readiness.
- Added persistence restore, snapshot immutability and failed-write rollback checks.
- API authentication/rate-limit errors are sanitized; an omitted Tavily extraction URL is explicitly unverified.
- Keyless configuration preflight distinguishes configured values from live readiness.
- Keyboard activation, error alerts, busy state and saved source-review reload improve recovery without another paid search. Browser checks passed locally.

Provider setup and credit instructions: `api-access-guide.md`. No live API calls or key creation occurred.

## Additional parallel hardening

- Failed session creation rolls back memory state; retry no longer consumes phantom capacity. Regression test passes.
- Conflicting duplicate Tavily Extract content and simultaneous success/failure lose extracted provenance, show warnings and require review. Two regression tests pass.
- Re-run: 121 automated tests and all 26 offline cases pass. Live API and public-host checks remain pending.
