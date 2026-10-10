# API access — verified 2 October 2026

Two server-side keys are needed. NVIDIA has no separate API key here: its model runs through Nebius Token Factory. AI Cloud credentials are not required for this inference path.

## Nebius Token Factory

1. Sign in/register at https://tokenfactory.nebius.com/.
2. Open https://tokenfactory.nebius.com/project/api-keys.
3. Choose **Create API key**, name it `bbn-hackathon-dev`, save the displayed secret immediately. It cannot be displayed again.
4. Set `NEBIUS_API_KEY` in the server environment.
5. Check available NVIDIA model IDs; configurable default: `nvidia/nemotron-3-super-120b-a12b`. Availability and response remain unverified until a live call.

Official kickoff offers $25 using `NEBIUS-DEVPOST-GLOBAL26`, plus another $25 through Builders Program. The published page does not explain the current redemption UI; use the account credit/promo interface or organizer support if absent. Do not enable a paid plan merely to find this field.

## Tavily

1. Sign in/register at https://app.tavily.com/.
2. Copy a project API key from the dashboard.
3. Set `TAVILY_API_KEY` in the server environment.

Free tier: 1,000 API credits monthly without a card. Search/Extract consume API credits, not model tokens. Builders Program advertises $25 Tavily credit, subject to eligibility and partner terms.

## Connect and check

Copy `.env.example` to `.env`, enter values locally, keep it out of Git. Secrets do not belong in chat, screenshots, docs or browser code.

```bash
node --env-file=.env scripts/config-preflight.mjs --require-live
node --env-file=.env scripts/live-smoke.mjs --require-live
node --env-file=.env app/server.mjs
```

Preflight makes no external calls and prints presence/validity only. Smoke uses real requests and credits, reporting sanitized success/errors and latency. Configured keys do not prove API success. Live evaluation follows smoke; inspect credit balance first.

## Local access update — 4 October 2026

Both provider keys are present only in the ignored local `.env`, mode 0600. Real smoke, model evaluation and the research workflow have passed; see [live-verification-2026-10-04.md](live-verification-2026-10-04.md). Do not recreate keys merely because the dated initial access notes are old. Hackathon promo activation and actual billing balance are still unconfirmed. No paid top-up is authorized by this setup.

## Official references

- https://docs.tokenfactory.nebius.com/api-reference/introduction
- https://docs.tavily.com/documentation/quickstart
- https://nebiusglobalaihackathon.devpost.com/updates/46203-kickoff-tips
- https://dev.nebius.com/builders
