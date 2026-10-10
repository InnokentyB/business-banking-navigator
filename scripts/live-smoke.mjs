import { demoData } from '../app/demo-data.mjs';
import { researchData } from '../app/research-data.mjs';
import { fetchBankSources, inferWithNemotron } from '../app/adapters.mjs';

const tavilyPresent = Boolean(process.env.TAVILY_API_KEY?.trim());
const nebiusPresent = Boolean(process.env.NEBIUS_API_KEY?.trim());
const requireLive = process.argv.includes('--require-live');
console.log(JSON.stringify({ tavilyKeyPresent: tavilyPresent, nebiusKeyPresent: nebiusPresent }));

let failed = requireLive && (!tavilyPresent || !nebiusPresent);
if (tavilyPresent) {
  for (const route of researchData.requirementsByRoute) {
    try {
      const started = performance.now();
      const { sources, errors } = await fetchBankSources({
        query: route.searchQuery, officialDomains: route.officialDomains, apiKey: process.env.TAVILY_API_KEY,
      });
      const officialExtracted = sources.filter(s => {
        const hostname = new URL(s.url).hostname.toLowerCase();
        return route.officialDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`)) && s.provenance.extract && s.content.trim();
      });
      const ok = officialExtracted.length > 0;
      if (!ok) failed = true;
      console.log(JSON.stringify({ service: 'tavily', routeId: route.routeId, ok, sourceCount: sources.length, officialExtractedCount: officialExtracted.length, errorCodes: errors.map(e => e.code), latencyMs: Math.round(performance.now() - started) }));
    } catch (error) {
      failed = true;
      console.log(JSON.stringify({ service: 'tavily', routeId: route.routeId, ok: false, code: error.code ?? 'UNKNOWN_ERROR' }));
    }
  }
} else console.log(JSON.stringify({ service: 'tavily', skipped: true, reason: 'missing key' }));

if (nebiusPresent) {
  try {
    const started = performance.now();
    const requirements = demoData.requirementsByRoute[0].requirements.slice(0, 2);
    const { items } = await inferWithNemotron({
      profile: demoData.profile, requirements, evidence: demoData.evidence,
      apiKey: process.env.NEBIUS_API_KEY, model: process.env.NEBIUS_MODEL || undefined,
    });
    const ok = items.length === requirements.length;
    if (!ok) failed = true;
    console.log(JSON.stringify({ service: 'nebius', ok, itemCount: items.length, model: process.env.NEBIUS_MODEL || 'nvidia/nemotron-3-super-120b-a12b', latencyMs: Math.round(performance.now() - started) }));
  } catch (error) {
    failed = true;
    console.log(JSON.stringify({ service: 'nebius', ok: false, code: error.code ?? 'UNKNOWN_ERROR' }));
  }
} else console.log(JSON.stringify({ service: 'nebius', skipped: true, reason: 'missing key' }));

if (failed) process.exitCode = 1;
