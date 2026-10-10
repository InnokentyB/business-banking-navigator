# Business Banking Navigator · submission draft · 2026-10-06

Status: not submitted. Public URL, remote repository, video and customer-validation findings remain unavailable. Final submission requires the owner's separate decision.

## Inspiration

A founder choosing banking for a Portuguese company has to connect business needs with provider capabilities, fee conditions and onboarding restrictions. Our hypothesis is that a source-backed comparison followed by preparation makes the decision easier to explain. Interviews and measured customer benefit are still pending.

## What it does

The local synthetic prototype collects banking needs, separates essential requirements from preferences, compares six researched opening routes, exposes supporting facts and open questions, and lets the user choose an option. Published tariff options for six providers retain monthly/annual billing, tax conditions and incomplete cost coverage. Qonto's SEPA/direct-debit scenario has a partial calculator; other transaction costs remain unknown. Saved comparisons can be downloaded or printed.

The chosen option leads into document preparation. Source changes require explicit review, and evidence analysis produces versioned checklists. Unknown eligibility is not a bank rejection; a ready checklist is not bank acceptance. No application or reply is sent to a bank. All company data remains synthetic.

## How it is built

Node.js provides authoritative session APIs and a web interface. Selection and tariff calculations use deterministic published facts. Tavily Search/Extract supplies source candidates for human review. NVIDIA Nemotron 3 Super through Nebius Token Factory proposes evidence matches in a constrained schema; independent application checks enforce evidence groups, identity, applicability and version consistency. API credentials stay server-side in local environment configuration.

## Current verification

163 automated tests and 26 offline safety cases pass locally. The 26-case real-provider run accepted 25 responses and rejected duplicate input before the API call; every expected final outcome matched and there were zero raw or final false-ready decisions. Six-route live browser E2E passed with real Tavily and Token Factory. Local needs, comparison, tariff and report browser scenarios also pass. These checks do not establish customer usefulness, complete bank coverage, public-host readiness or real-data security.

## Next steps

Validate usability and the first customer segment, expand capability/eligibility and FX/transaction coverage, review experience data separately from official policy, and obtain a deployment decision. Before accepting real documents, implement authentication, tenant isolation, secure file handling and retention. No measured savings, banking approval prediction, public launch or submission is claimed.
