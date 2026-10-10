> Current selection goal and implementation supersede the preparation-only framing below. See `product/TDPD-selection-2026-10-06.md` and `product/readiness-2026-10-06.md`. Historical requirements remain reference; six runtime routes and partial published fees are verified locally, with no public submission.

# Business Banking Navigator — implementation and validation spec v0.1

Date: 2026-10-01. This is the P0 implementation contract, subject to source verification. Provider choices below are for this build; user value is defined in prd.md.

## Vertical slice

Synthetic profile + documents → Tavily public source fetch → normalized requirement records → Nemotron 3 Super via Nebius Token Factory → two bank packages → follow-up request → human-approved revised export.

## Minimal data contracts

- `CompanyProfile`: legal name, country, registration number (synthetic), business activity, representatives, owners, document IDs, each with origin.
- `Source`: bank, route, URL, excerpt, retrieved_at, live/fixture, applicability condition, confidence/review status.
- `Requirement`: bank, route, description, source_id, condition, evidence_kind; no unsupported item accepted as verified.
- `Evidence`: document ID, type, extracted fields, document origin, redaction status; synthetic only.
- `PackageItem`: requirement_id, evidence_ids, status (`ready|missing|uncertain|not_applicable`), rationale, source_id.
- `FollowUp`: bank, requested item, related requirement IDs, proposed response, approval timestamp, revision history.

## Services

- Backend owns API keys, fetches public pages with Tavily Search/Extract, and calls Token Factory's OpenAI-compatible API with model `nvidia/nemotron-3-super-120b-a12b` (verify model availability at setup).
- Prompt accepts bounded, cited source text and company facts; schema validation rejects malformed outputs; application logic checks source IDs and valid statuses. Deterministic rules handle required source links and approval gating.
- UI: company profile, bank comparison, per-bank package, follow-up review. Export can be a printable page or downloadable JSON/PDF; choose the smallest reliable implementation.
- Persist sample state in lightweight storage. Dated retained data makes the flow reliable; show clearly when live fetch failed. Secrets remain server-side and out of the codebase.

## Test-first cases

| Case | Input | Expected result |
| --- | --- | --- |
| A | Two source pages with different requirements | Two materially different packages, each item linked to correct source |
| B | Online route has a nationality/residency condition, company does not prove it | Route marked uncertain/check directly; no bank-wide rejection |
| C | Model invents a document absent from all sources | Validation rejects factual requirement or labels it unverified |
| D | One required document missing | Package item is `missing`; never `ready` |
| E | Bank asks for another document; user adds it | Related item updates, change log records revision, export awaits approval |
| F | Tavily fails or source changes | Dated fixture/error is explicit, no claim of fresh verification |
| G | Token Factory fails or returns invalid JSON | Honest error, no fabricated successful package |
| H | Fresh session | User can run complete sample flow without entering personal data |

## Delivery sequence

1. Verify two banks' source pages and freeze synthetic case + expected outputs.
2. Build deterministic fixtures, contracts, and UI skeleton for the full flow.
3. Wire live Tavily and Token Factory Nemotron calls; schema and provenance checks.
4. Implement follow-up revision, approval and export.
5. Conduct founder/accountant discovery and revise positioning.
6. Deploy and rehearse the complete product flow.

## Definition of done for P0

AC1–AC7 pass against the synthetic case; actual inference and search calls are observable; each conclusion can be traced to a source; the app supports the complete business job.
