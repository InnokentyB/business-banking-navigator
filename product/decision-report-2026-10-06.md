# Decision comparison export

A synthetic founder can save a current assessed comparison before preparing documents. JSON and printable HTML carry decision revision/policy, needs, chosen route, eligibility, reasons, open questions, capability sources and published tariff options. They are draft decision-support artifacts, not approval or a bank submission.

API: `GET /api/sessions/:sessionId/decision/export` and `/print`. Session capability is required. Draft/unassessed/stale decisions return 409; unknown session returns 404. Cache is disabled; session capability, keys, evidence bodies and historical personal metadata are not part of the export. HTML escapes input and uses the existing print stylesheet/CSP. Saved old decision snapshots are not silently upgraded.

RED: three API acceptance cases failed before implementation. GREEN: current comparison/choice provenance, secret/capability omission, draft/session rejection and HTML escaping. Browser scenario covers multi-currency selection, Revolut handoff, draft checklist, download, print and mobile. Human usability verdict is still required.
