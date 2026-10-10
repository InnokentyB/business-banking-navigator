import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DemoStore } from '../app/store.mjs';
import { sourceCandidates, reviewedRoute } from '../app/sources.mjs';

test('store persists approved snapshot and revisions without aliasing after restart', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bbn-store-'));
  try {
    const file = join(directory, 'sessions.json');
    const first = new DemoStore({ file });
    const session = first.create({ profile: { synthetic: true } });
    const approved = { id: 'P1', routeId: 'B', revision: 1, version: 1, status: 'ready', state: 'approved', approval: { version: 1 } };
    first.mutate(session, () => first.put(session, approved, 'approved'));
    const restored = new DemoStore({ file }), reopened = restored.get(session.id);
    assert.equal(restored.package(reopened, 'P1').approval.version, 1);
    assert.equal(reopened.snapshots['P1:1'].state, 'approved');
    restored.mutate(reopened, () => restored.invalidate(reopened, 'B', 'source_changed'));
    assert.equal(restored.package(reopened, 'P1').state, 'stale');
    assert.equal(restored.package(reopened, 'P1').approval, null);
    assert.equal(reopened.snapshots['P1:1'].approval.version, 1);
    assert.equal(new DemoStore({ file }).get(session.id).packages.P1.state, 'stale');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('failed store mutation rolls back current package and command', () => {
  const store = new DemoStore();
  const session = store.create({});
  assert.throws(() => store.command(session, 'revision-one', { id: 1 }, () => {
    store.put(session, { id: 'P1', routeId: 'B', revision: 1, state: 'approved' }, 'approved');
    throw new Error('write failed');
  }), /write failed/);
  const reopened = store.get(session.id);
  assert.deepEqual(reopened.packages, {});
  assert.deepEqual(reopened.snapshots, {});
  assert.deepEqual(reopened.commands, {});
});

test('failed session persistence does not consume capacity and creation can be retried', () => {
  const store = new DemoStore({ maxSessions: 1 });
  const save = store.save.bind(store);
  store.save = () => { throw new Error('disk unavailable'); };
  assert.throws(() => store.create({ profile: { synthetic: true } }), /disk unavailable/);
  assert.deepEqual(store.sessions, {});

  store.save = save;
  const session = store.create({ profile: { synthetic: true } });
  assert.equal(store.get(session.id).profile.synthetic, true);
  assert.equal(Object.keys(store.sessions).length, 1);
});

test('source refresh compares the latest active version, not an older stale publication', () => {
  const route = { routeId: 'B', bank: 'BPI', officialDomains: ['bancobpi.pt'], sources: [
    { id: 'v1', url: 'https://www.bancobpi.pt/empresas/docs', excerpt: 'outdated', stale: true },
    { id: 'v2', url: 'https://www.bancobpi.pt/empresas/docs', excerpt: 'current', stale: false },
  ] };
  const candidates = sourceCandidates(route, [{ id: 'v3', url: 'https://www.bancobpi.pt/empresas/docs', content: 'current', retrievedAt: '2026-10-02T10:00:00Z' }], 'live-tavily');
  assert.equal(candidates[0].changed, false);
  assert.equal(candidates[0].previousSource.id, 'v2');
});

test('approved changed publication marks old source stale but retains historical copy', () => {
  const route = { routeId: 'B', bank: 'BPI', requirementsVersion: 1, officialDomains: ['bancobpi.pt'], sources: [
    { id: 'v1', url: 'https://www.bancobpi.pt/empresas/docs', excerpt: 'old', retrievedAt: '2026-10-01' },
  ] };
  const candidate = sourceCandidates(route, [{ id: 'v2', url: 'https://www.bancobpi.pt/empresas/docs', content: 'new', retrievedAt: '2026-10-02' }], 'live-tavily')[0];
  assert.equal(candidate.changed, true);
  const updated = reviewedRoute(route, candidate, [{ id: 'R1', label: 'A reviewed rule', sourceId: candidate.source.id, evidenceType: 'registration' }]);
  assert.equal(updated.sources[0].stale, true);
  assert.equal(updated.sources[1].stale, undefined);
  assert.equal(updated.requirementsVersion, 2);
  assert.equal(route.sources[0].stale, undefined);
});
