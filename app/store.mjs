import { randomUUID, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function failure(status, code, message) { return Object.assign(new Error(message), { status, code }); }
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Single-process demo store. Optional atomic disk persistence contains synthetic sessions only.
export class DemoStore {
  constructor({ file, ttlMs = 24 * 60 * 60 * 1000, maxSessions = 100, now = Date.now } = {}) {
    this.file = file; this.ttlMs = ttlMs; this.maxSessions = maxSessions; this.now = now;
    this.sessions = file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).sessions : {};
    this.prune(); this.save();
  }
  prune() { for (const [id, session] of Object.entries(this.sessions)) if (session.expiresAt <= this.now()) delete this.sessions[id]; }
  save() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const temp = `${this.file}.tmp`;
    writeFileSync(temp, JSON.stringify({ schemaVersion: 1, sessions: this.sessions }), { mode: 0o600 });
    renameSync(temp, this.file);
  }
  create(data) {
    this.prune();
    if (Object.keys(this.sessions).length >= this.maxSessions) throw failure(429, 'SESSION_LIMIT', 'Demo capacity reached. Try again later.');
    const session = { id: randomUUID(), expiresAt: this.now() + this.ttlMs, inputRevision: 0, packages: {}, snapshots: {}, events: [], commands: {}, candidates: {}, ...structuredClone(data) };
    this.sessions[session.id] = session;
    try { this.save(); }
    catch (error) { delete this.sessions[session.id]; throw error; }
    return session;
  }
  get(id) {
    const session = typeof id === 'string' && Object.hasOwn(this.sessions, id) ? this.sessions[id] : null;
    if (session?.expiresAt <= this.now()) { delete this.sessions[id]; this.save(); }
    if (!session || session.expiresAt <= this.now()) throw failure(404, 'SESSION_EXPIRED', 'Demo session expired or unavailable. Reload the demo.');
    return session;
  }
  delete(id) {
    const session = this.get(id); delete this.sessions[id];
    try { this.save(); } catch (error) { this.sessions[id] = session; throw error; }
  }
  mutate(session, fn) {
    const previous = structuredClone(session);
    try { const result = fn(session); this.save(); return result; }
    catch (error) { this.sessions[session.id] = previous; throw error; }
  }
  command(session, key, input, fn) {
    if (typeof key !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,99}$/.test(key)) throw failure(400, 'IDEMPOTENCY_KEY', 'A command key of 8–100 letters, digits or hyphens is required.');
    const hash = fingerprint(input), previous = Object.hasOwn(session.commands, key) ? session.commands[key] : null;
    if (previous) {
      if (previous.hash !== hash) throw failure(409, 'IDEMPOTENCY_CONFLICT', 'This command key was already used for different input.');
      return structuredClone(previous.result);
    }
    if (Object.keys(session.commands).length >= 200) throw failure(429, 'COMMAND_LIMIT', 'Reload the synthetic demo to start a new session.');
    return this.mutate(session, () => { const result = fn(); session.commands[key] = { hash, result: structuredClone(result) }; return result; });
  }
  package(session, id, revision) {
    const pkg = Object.hasOwn(session.packages, id) ? session.packages[id] : null;
    if (!pkg) throw failure(404, 'PACKAGE_NOT_FOUND', 'Package not found in this demo session.');
    if (revision !== undefined && (!Number.isInteger(revision) || revision !== pkg.revision)) throw failure(409, 'REVISION_CONFLICT', `Package changed. Reload revision ${pkg.revision} before continuing.`);
    return pkg;
  }
  put(session, pkg, reason) {
    if (Object.keys(session.snapshots).length >= 100) throw failure(429, 'REVISION_LIMIT', 'This synthetic session reached its revision limit. Start a new demo session.');
    session.packages[pkg.id] = structuredClone(pkg);
    session.snapshots[`${pkg.id}:${pkg.revision}`] = structuredClone(pkg);
    session.events.push({ type: reason, packageId: pkg.id, revision: pkg.revision, at: new Date(this.now()).toISOString() });
    if (session.events.length > 300) session.events.splice(0, session.events.length - 300);
    return pkg;
  }
  invalidate(session, routeId, reason) {
    for (const pkg of Object.values(session.packages)) {
      if (routeId && pkg.routeId !== routeId) continue;
      if (pkg.state === 'stale') continue;
      this.put(session, { ...pkg, revision: pkg.revision + 1, version: pkg.revision + 1, state: 'stale', approval: null, approvedAt: null, staleReason: reason }, reason);
    }
  }
}
