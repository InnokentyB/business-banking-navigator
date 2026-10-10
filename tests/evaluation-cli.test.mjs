import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function evaluate(args = []) {
  return spawnSync(process.execPath, ['scripts/evaluate.mjs', ...args], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, NEBIUS_API_KEY: '' }, encoding: 'utf8',
  });
}

test('offline evaluation verifies the dataset without live credentials', () => {
  const result = evaluate();
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.offline.evaluated, 26);
  assert.equal(report.offline.passed, 26);
  assert.equal(report.live.attempted, 0);
  assert.equal(report.live.p95LatencyMs, null);
});

test('explicit live evaluation fails its gate when the key is absent', () => {
  const result = evaluate(['--live']);
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.live.skipped, 'NEBIUS_API_KEY absent');
  assert.equal(report.live.attempted, 0);
  assert.equal(report.live.p50LatencyMs, null);
});
