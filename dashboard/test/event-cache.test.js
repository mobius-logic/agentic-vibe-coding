// dashboard/test/event-cache.test.js
// Unit tests for EventCache class

'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { EventCache } = require('../lib/collectors/event-cache');

function tmpDir() {
  const dir = path.join(os.tmpdir(), `event-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeEvents(dir, events) {
  const content = events.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'events.jsonl'), content, 'utf8');
}

describe('EventCache', () => {
  const caches = [];

  afterEach(() => {
    for (const c of caches) c.destroy();
    caches.length = 0;
  });

  it('should load events from an existing file', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'architect', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'architect', event: 'session-complete' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const loaded = cache.getEvents();
    assert.equal(loaded.length, 2);
    assert.equal(loaded[0].agent, 'architect');
    assert.equal(loaded[1].event, 'session-complete');
  });

  it('should return empty arrays for missing file', () => {
    const cache = new EventCache('/nonexistent/events.jsonl');
    caches.push(cache);

    assert.deepEqual(cache.getEvents(), []);
    assert.deepEqual(cache.getActiveAgents(), []);
    assert.deepEqual(cache.getGraph(), { nodes: [], edges: [] });
  });

  it('should limit events with getEvents(limit)', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'a', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'b', event: 'spawned' },
      { ts: '2026-04-10T10:02:00Z', agent: 'c', event: 'spawned' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const limited = cache.getEvents(2);
    assert.equal(limited.length, 2);
    assert.equal(limited[0].agent, 'b');
    assert.equal(limited[1].agent, 'c');
  });

  it('should derive agent states from events', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'backend-lead', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'backend-lead', event: 'task-started', task: 'Build API', taskTotal: 3 },
      { ts: '2026-04-10T10:05:00Z', agent: 'backend-lead', event: 'task-completed', task: 'Build API', taskTotal: 3 },
      { ts: '2026-04-10T10:06:00Z', agent: 'developer', event: 'spawned' },
      { ts: '2026-04-10T10:10:00Z', agent: 'developer', event: 'session-complete' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const agents = cache.getActiveAgents();
    assert.ok(agents.length >= 2);

    const bl = agents.find(a => a.agent === 'backend-lead');
    assert.ok(bl);
    assert.equal(bl.tasksCompleted, 1);
    assert.equal(bl.tasksTotal, 3);

    const dev = agents.find(a => a.agent === 'developer');
    assert.ok(dev);
    assert.equal(dev.status, 'completed');
  });

  it('should build graph from subagent-invoked events', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'backend-lead', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'backend-lead', event: 'subagent-invoked', detail: '@developer: Build login' },
      { ts: '2026-04-10T10:02:00Z', agent: 'developer', event: 'spawned' },
      { ts: '2026-04-10T10:03:00Z', agent: 'backend-lead', event: 'subagent-invoked', detail: 'tester' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const graph = cache.getGraph();
    assert.ok(graph.nodes.length >= 3);
    assert.equal(graph.edges.length, 2);

    const edge1 = graph.edges[0];
    assert.equal(edge1.from, 'backend-lead');
    assert.equal(edge1.to, 'developer');
    assert.equal(edge1.task, 'Build login');

    const edge2 = graph.edges[1];
    assert.equal(edge2.from, 'backend-lead');
    assert.equal(edge2.to, 'tester');
    assert.equal(edge2.task, null);
  });

  it('should call onNewEvents callback when new events are appended', (t, done) => {
    const dir = tmpDir();
    const initial = [
      { ts: '2026-04-10T10:00:00Z', agent: 'a', event: 'spawned' },
    ];
    writeEvents(dir, initial);

    const received = [];
    const cache = new EventCache(path.join(dir, 'events.jsonl'), (newEvts) => {
      received.push(...newEvts);
      if (received.length >= 1) {
        assert.equal(received[0].agent, 'b');
        cache.destroy();
        done();
      }
    });
    caches.push(cache);

    // Append a new event after a short delay
    setTimeout(() => {
      const newLine = JSON.stringify({ ts: '2026-04-10T10:05:00Z', agent: 'b', event: 'spawned' }) + '\n';
      fs.appendFileSync(path.join(dir, 'events.jsonl'), newLine, 'utf8');
    }, 200);
  });

  it('should handle empty events file', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'events.jsonl'), '', 'utf8');

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    assert.deepEqual(cache.getEvents(), []);
    assert.deepEqual(cache.getActiveAgents(), []);
  });

  it('should include correct icons for known agents', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'architect', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'unknown-agent', event: 'spawned' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const graph = cache.getGraph();
    const architect = graph.nodes.find(n => n.id === 'architect');
    assert.equal(architect.icon, '🏗️');

    const unknown = graph.nodes.find(n => n.id === 'unknown-agent');
    assert.equal(unknown.icon, '🤖');
  });

  it('should destroy cleanly', () => {
    const dir = tmpDir();
    writeEvents(dir, [{ ts: '2026-04-10T10:00:00Z', agent: 'a', event: 'spawned' }]);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    // Should not throw
    cache.destroy();
    cache.destroy(); // double-destroy should be safe
  });
});
