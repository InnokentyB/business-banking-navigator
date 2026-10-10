> Current selection goal and implementation supersede the preparation-only framing below. See `product/TDPD-selection-2026-10-06.md` and `product/readiness-2026-10-06.md`. Historical requirements remain reference; six runtime routes and partial published fees are verified locally, with no public submission.

# Business Banking Navigator — TDPD product requirements v0.1

Date: 2026-10-01. Test-Driven Product Development: acceptance criteria precede implementation.

## Context → decision → validation

**Context:** A founder or accountant prepares multiple Portuguese SME bank applications. Published information is scattered and conditional. A reusable company profile saves re-entry, but an incorrect claim about eligibility is costly.

**Decision:** Build a source-grounded workspace for preparation and follow-up. Use a model to map requirements to evidence and a search/extraction service to update public sources. Keep the user in control of exports and replies. The chosen providers are recorded in the implementation spec.

**Validation:** Run the exact synthetic case end to end and test it with prospective users. A requirement without a supporting source or a condition not established by evidence must be shown as unknown, never silently marked satisfied.

## User stories and acceptance criteria

### AC1 — reusable company profile (P0)

Given a synthetic company with registry details, representative, founders, activity and document inventory, when the user saves it, then the profile persists through comparison and both packages; each extracted field shows its source or manual origin. Missing UBO/identity data remains missing. No real personal data is required.

### AC2 — current bank requirements (P0)

Given two configured bank routes, when the user refreshes requirements, then the app retrieves public pages and shows URL, captured excerpt, observed date and any condition. If retrieval fails, the app marks the source stale/unavailable and offers dated retained data; it never labels it as live.

### AC3 — route comparison (P0)

Given a foreign-founder condition that affects one public online route, when the routes are compared, then the app explains the exact route limitation with citation and marks the status "check directly" where bank-wide eligibility is not established. It never equates an online route restriction with rejection by the bank.

### AC4 — tailored packages (P0)

Given one company profile and two banks' requirements, when the user generates packages, then the analysis runs on current inputs, output conforms to the defined schema, and two separate packages list required item, evidence used, source, and status (`ready`, `missing`, `uncertain`, `not_applicable`). There must be at least one substantive difference between packages. Unsourced requirements cannot be presented as fact.

### AC5 — follow-up and approval (P0)

Given a simulated bank request for additional evidence, when the user adds the missing document or correction, then the affected checklist status and draft reply update, a before/after change record is visible, and export of the reply requires a deliberate approval action. Nothing is sent to a bank by the app.

### AC6 — failure and trust (P0)

Given a model timeout, invalid schema, contradictory source, or ambiguous document, then the UI shows an actionable error/uncertain state and does not fabricate a completed package. A reviewer can inspect the exact source and evidence behind every conclusion.

### AC7 — repeatable product flow (P0)

Given a fresh user session, when the sample case is opened and run, then the complete flow works without personal data; the user can inspect sources, compare packages, handle a follow-up and approve an export.

## Product metric hypotheses

Measure user time to build two packages, duplicate fields entered, unsupported claims caught, and follow-up turnaround. Targets are set only after baseline observation; no fabricated uplift or TAM claim.

## Discovery questions

Who actually coordinates multi-bank applications? How often are two banks pursued? Which documents repeat? Which differences force rework? Would an accountant use a shared workspace? What would they trust and pay for? Gather five concrete recent journeys before strengthening the impact claim.
