# Deployment and verification runbook

## Local

Run `npm test`, then `npm start`. Optional `.env`: `node --env-file=.env app/server.mjs`. Set `DATA_FILE` to a writable private directory to preserve synthetic sessions across restart. Do not run two processes against one JSON file. Atomic rename protects completed commands; a real database is required for multi-instance deployment.

## Container (prepared; Docker unavailable in build workspace)

Copy `.env.example` to `.env`, fill server keys locally, then `docker compose -f deployment/compose.yaml up --build -d`. The port binds to localhost; place HTTPS reverse proxy in front for a public demo. The container runs as the unprivileged node user, with dropped capabilities, a health check and a named synthetic-state volume. Build/run still requires verification on a Docker-enabled host.

## Browser QA

Run `npm ci` to install the pinned Playwright dependency, then `npx playwright install chromium`, and `npm run test:browser`. These steps need package/CDN network access. Local browser QA passed on Chromium 153 through a bundled npm binary after the Playwright CDN returned an empty archive. On Linux x64, `node scripts/browser-fallback.mjs` downloads a pinned temporary package and prints the `BROWSER_EXECUTABLE=... npm run test:browser` command. On macOS/other platforms use Playwright's normal installer. The override enables a no-sandbox headless launch for isolated CI/test environments only; it is not a production browser configuration.

The suite starts an isolated keyless local server and verifies session recovery, source review, draft/approved downloads, printable output, follow-up/reply restoration, request classification, two-window conflict, evidence removal, revision history, deletion and 390px layout. Desktop/mobile captures are generated under `artifacts/` (not committed). GitHub CI is prepared but has not run remotely.

## Public release gate

1. Choose and provision one Node/container host with HTTPS and a persistent writable volume. Configure secret environment values in the host, not in frontend or Git.
2. Verify `/health` and `/ready`, then `npm run smoke:live` with keys. Preserve only sanitized status/latency/model evidence; never API keys or response bodies containing sensitive data.
3. Execute `tests/browser-e2e.mjs` and the actual research path with a private/incognito browser on the public URL. Verify a real Tavily Extract candidate is reviewed into requirements used by the live model, not just a separate search panel.
4. Confirm root license, README clean start, no secret or state file in Git, repo visibility, and all public source attributions.
5. Record the <3-minute English demo after the actual runtime checks pass. Keep the site available throughout judging; configure availability/cost alerts at the hosting provider.
6. Prepare Devpost as a draft. Submit only after the owner's separate decision.

## Recovery

If a provider is down: existing server snapshots remain available. Search uses the explicitly dated saved fallback; model failure is reported without creating a new package. Retry the same analysis command key after a transport failure. Version conflict requires reloading/reviewing current state, not silently overwriting it. If the state volume is lost, start a fresh synthetic session and disclose the reset. If live service budget is exceeded, wait for the next minute; no secret should appear in an error.

## Pending external inputs

Nebius Token Factory project key and model availability; Tavily key/credits; host/account and repository destination; real-founder/accountant interviews; final submission decision. Do not collect real business documents to work around a missing synthetic demo feature.
