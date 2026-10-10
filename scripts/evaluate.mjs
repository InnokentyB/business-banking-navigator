import {liveEvaluationPassed} from '../evaluation/gate.mjs';
import { cases } from '../evaluation/cases.mjs';
import { buildPackages } from '../app/domain.mjs';
import { inferWithNemotron } from '../app/adapters.mjs';

const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const keyPresent = Boolean(process.env.NEBIUS_API_KEY?.trim());
const offline = { evaluated: 0, passed: 0, failed: [] };
for (const testcase of cases) {
  const actual = buildPackages({ profile: testcase.profile, evidence: testcase.evidence, requirementsByRoute: [testcase.route], proposals: testcase.proposals }).packages[0]?.items[0]?.status;
  offline.evaluated++;
  if (actual === testcase.expectedStatus) offline.passed++;
  else offline.failed.push({ id: testcase.id, expected: testcase.expectedStatus, actual: actual ?? null });
}
const report = { kind: 'product-safety-evaluation', datasetSize: cases.length, offline, live: { attempted: 0, schemaValid: 0, falseReady: 0, finalFalseReady: 0, finalMatched: 0, inputRejected: 0, totalTokens: 0, usageReported: 0, failures: [], results: [], latencyMs: [] } };
if (!live) report.live.skipped = 'opt-in required';
else if (!keyPresent) {
  report.live.skipped = 'NEBIUS_API_KEY absent';
  process.exitCode = 1;
}
else {
  for (const testcase of cases) {
    const started = performance.now();
    report.live.attempted++;
    try {
      const requirements = testcase.route.requirements.map(r => ({ ...r, source: testcase.route.sources.find(s => s.id === r.sourceId) || { unavailable: true } }));
      const { items, usage } = await inferWithNemotron({ profile: testcase.profile, requirements, evidence: testcase.evidence, apiKey: process.env.NEBIUS_API_KEY });
      const latencyMs = Math.round(performance.now() - started);
      report.live.latencyMs.push(latencyMs);
      report.live.schemaValid++;
      if (usage?.total_tokens !== undefined) { report.live.totalTokens += usage.total_tokens; report.live.usageReported++; }
      const injectedProposal = testcase.proposals.length > 0;
      if (!injectedProposal && testcase.expectedStatus !== 'ready' && items.some(i => i.status === 'ready')) report.live.falseReady++;
      const proposals = injectedProposal ? testcase.proposals : items.map(item => ({ ...item, routeId: testcase.route.routeId }));
      const actual = buildPackages({ profile: testcase.profile, evidence: testcase.evidence, requirementsByRoute: [testcase.route], proposals }).packages[0]?.items[0]?.status;
      if (actual === testcase.expectedStatus) report.live.finalMatched++;
      if (testcase.expectedStatus !== 'ready' && actual === 'ready') report.live.finalFalseReady++;
      report.live.results.push({ id: testcase.id, expected: testcase.expectedStatus, modelStatus: items[0]?.status, finalStatus: actual, injectedProposal, latencyMs });
    } catch (error) {
      report.live.latencyMs.push(Math.round(performance.now() - started));
      if (testcase.id === 'E25-duplicate-evidence' && error.code === 'INVALID_INPUT') {
        report.live.inputRejected++;
        report.live.results.push({ id: testcase.id, expected: testcase.expectedStatus, outcome: 'duplicate input rejected before API call' });
      } else report.live.failures.push({ id: testcase.id, code: error.code ?? 'UNKNOWN_ERROR' });
    }
  }
}
const sortedLatency = [...report.live.latencyMs].sort((a, b) => a - b);
const percentile = p => sortedLatency.length ? sortedLatency[Math.ceil(sortedLatency.length * p) - 1] : null;
report.live.p50LatencyMs = percentile(0.50);
report.live.p95LatencyMs = percentile(0.95);
report.live.costUsd = null; // Token usage is measured; provider billing and credit redemption must be checked separately.
report.live.gatePassed=live ? liveEvaluationPassed(report) : null;
console.log(JSON.stringify(report));
if (offline.failed.length || (live && !report.live.gatePassed)) process.exitCode = 1;
