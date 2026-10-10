> Current selection goal and implementation supersede the preparation-only framing below. See `product/TDPD-selection-2026-10-06.md` and `product/readiness-2026-10-06.md`. Historical requirements remain reference; six runtime routes and partial published fees are verified locally, with no public submission.

# Business Banking Navigator — scope v0.1

Date: 2026-10-01. Working title. Product scope for the first implementation.

## Problem

An SME founder opening a business account in Portugal must understand different banks' published requirements, repeatedly assemble overlapping company and identity information, and react to follow-up requests. We have evidence that requirements vary; the frequency, time cost, and willingness to pay for this exact workflow remain hypotheses to validate with founders and accountants.

## User and job

Initial user: a founder or accountant helping a newly incorporated Portuguese SME with at least one foreign founder. Job: identify feasible application routes, assemble an accurate reusable company profile, prepare separate evidence-backed packages for two banks, and resolve one additional request without starting over.

## Core loop

1. User enters a synthetic company profile and attaches sample documents.
2. Product retrieves public requirement pages for selected banks, recording URL, excerpt, retrieval date, and applicability caveat.
3. NVIDIA Nemotron 3 Super on Nebius Token Factory extracts and maps each requirement to existing evidence, missing evidence, or unknown applicability.
4. User compares two bank routes, inspects why each item is requested, and approves two tailored exportable checklists/packages.
5. A simulated bank follow-up arrives; product identifies the affected claims and proposes a reply; user approves the updated package.

The company chooses and submits applications itself. The product does not claim bank integration, eligibility approval, or legal/compliance advice.

## P0 — product core

- One reproducible Portugal SME scenario using synthetic data; two banks with distinct published requirements and a genuine route/applicability difference.
- Source-backed requirement capture with date, quote/excerpt, status, and a visible unknown state; a dated fallback when a public source is unavailable.
- Structured company profile and reusable evidence inventory; no real personal data.
- Two distinct bank-specific checklists/packages, each mapped to company evidence and source URL.
- One follow-up request, revised package, explicit human approval and change history.
- Real runtime inference in the main analysis path; errors surface honestly.
- Simple coherent UI that lets a user review, revise and export the prepared package.

## P1 — only after the core works

- Third bank, accountant multi-client workspace, PDF parsing, document expiry reminders, background refresh job, comparison of model variants.

## Out of scope

Direct bank application submission; credentials or screen automation in bank portals; bank API integrations; automatic KYB approval; broad EU coverage; advice that a specific bank will accept a customer.

## Success and evidence

- Product success in the demo: a person can prepare and explain two different complete-as-known application packages and update one after a follow-up, while seeing every unresolved item.
- Discovery: interview at least 5 relevant founders/accountants; collect last actual onboarding journey, document requests, repeats, elapsed time, existing workarounds, and willingness to use/pay. Record counterexamples. These interviews are research targets, not claims already proven.

## Decisions pending

Choose two specific banks after verifying the current public requirement pages; confirm project name; select deploy host; decide whether a third bank adds value. None blocks the first vertical slice.
