# Live inference reliability and bank offer expansion

Observed failure: a model proposed ready while one required evidence group had no proof. Existing server validation rejected it correctly and preserved prior state. Fix the model request, not the readiness guard.

Acceptance before implementation: model context explicitly lists matching evidence IDs for each required group and whether ready is permitted; incomplete groups, source review and unknown applicability disallow ready. Tests prove compound partial coverage, invalid/expired proof and source uncertainty. A forced bad model response must still fail, with no retry/extra billing loop. Live five-route browser workflow plus 26-case evaluation must be rerun, recording results without secrets. Any provider failure remains an open gate.

Offer expansion: add BPI standard monthly subscription prices with conditional discounted prices as context only; CGD published monthly maintenance fees, including stamp duty as stated by its source. These are product options under documentation routes, not promises of acceptance. Do not assume unknown SEPA fees or map volume across dissimilar tariff rules. Keep product scope, billing, tax and unknown costs visible. Tests cover conditional discount not applied, tax differences, stale evidence and unknown variable cost.

## Final outcome

Initial per-group prompting fixed coverage ambiguity but exposed an invalid-JSON response. Bounded output and disabled Nemotron thinking made the five-route live workflow pass. Subsequent evaluation found identity omissions and a stale-source response; per-requirement schema and independent identity checks fixed them. An empty known evidence set now permits only missing. Evaluation now fails on any unmatched final expectation, as well as false-ready or provider failure. Final real six-route browser and 26-case evaluation pass; earlier runs remain diagnostic history.

Cost expansion includes seventeen product options across six providers, while unknown operations and tax differences remain explicit. Full acceptance evidence and release limits are in `readiness-2026-10-06.md`.
