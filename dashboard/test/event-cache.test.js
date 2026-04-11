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
    assert.deepEqual(cache.getGraph(), { nodes: [], edges: [], workstreams: [] });
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

  it('should reset agent state on re-spawn', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'architect', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'architect', event: 'branch-created', branch: 'feature/arch/x' },
      { ts: '2026-04-10T10:02:00Z', agent: 'architect', event: 'plan-loaded', plan: '.plans/test.md', taskTotal: 5 },
      { ts: '2026-04-10T10:03:00Z', agent: 'architect', event: 'task-started', task: 'Design API', taskTotal: 5 },
      { ts: '2026-04-10T10:04:00Z', agent: 'architect', event: 'task-completed', taskTotal: 5 },
      { ts: '2026-04-10T10:05:00Z', agent: 'architect', event: 'session-complete' },
      { ts: '2026-04-10T11:00:00Z', agent: 'architect', event: 'spawned' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const agents = cache.getActiveAgents();
    const arch = agents.find(a => a.agent === 'architect');
    assert.ok(arch);
    assert.equal(arch.status, 'active');
    assert.equal(arch.branch, null);
    assert.equal(arch.plan, null);
    assert.equal(arch.tasksCompleted, 0);
    assert.equal(arch.tasksTotal, 0);
    assert.equal(arch.currentTask, null);
    assert.equal(arch.phase, null);
    assert.equal(arch.lastHeartbeat, null);
  });

  it('should prune completed/idle nodes from graph on spawn', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'backend-lead', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'backend-lead', event: 'subagent-invoked', detail: '@developer: Build login' },
      { ts: '2026-04-10T10:02:00Z', agent: 'developer', event: 'spawned' },
      { ts: '2026-04-10T10:03:00Z', agent: 'developer', event: 'session-complete' },
      { ts: '2026-04-10T10:04:00Z', agent: 'backend-lead', event: 'session-complete' },
      // New session starts
      { ts: '2026-04-10T11:00:00Z', agent: 'architect', event: 'spawned' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const graph = cache.getGraph();
    // Only architect should remain (backend-lead and developer were completed)
    assert.equal(graph.nodes.length, 1);
    assert.equal(graph.nodes[0].id, 'architect');
    // Edges should be pruned too
    assert.equal(graph.edges.length, 0);
  });

  it('should handle heartbeat events', () => {
    const dir = tmpDir();
    const recentTs = new Date().toISOString();
    const events = [
      { ts: recentTs, agent: 'architect', event: 'spawned' },
      { ts: recentTs, agent: 'architect', event: 'heartbeat', detail: 'Reading codebase', phase: 'thinking' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const agents = cache.getActiveAgents();
    const arch = agents.find(a => a.agent === 'architect');
    assert.ok(arch);
    assert.equal(arch.status, 'working');
    assert.equal(arch.currentTask, 'Reading codebase');
    assert.equal(arch.phase, 'thinking');
    assert.equal(arch.lastHeartbeat, recentTs);
  });

  it('should detect stale heartbeats and downgrade status', () => {
    const dir = tmpDir();
    // Use a timestamp far in the past so it's definitely stale
    const events = [
      { ts: '2020-01-01T00:00:00Z', agent: 'architect', event: 'spawned' },
      { ts: '2020-01-01T00:01:00Z', agent: 'architect', event: 'heartbeat', detail: 'Thinking...', phase: 'thinking' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const agents = cache.getActiveAgents();
    const arch = agents.find(a => a.agent === 'architect');
    assert.ok(arch);
    // Heartbeat from 2020 is definitely stale, so working should be downgraded to active
    assert.equal(arch.status, 'active');
  });

  it('should not downgrade non-stale heartbeats', () => {
    const dir = tmpDir();
    const recentTs = new Date().toISOString();
    const events = [
      { ts: recentTs, agent: 'architect', event: 'spawned' },
      { ts: recentTs, agent: 'architect', event: 'heartbeat', detail: 'Coding...', phase: 'coding' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const agents = cache.getActiveAgents();
    const arch = agents.find(a => a.agent === 'architect');
    assert.ok(arch);
    assert.equal(arch.status, 'working');
  });

  it('should enrich graph nodes with currentTask and phase', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'architect', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'architect', event: 'heartbeat', detail: 'Designing API', phase: 'thinking' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const graph = cache.getGraph();
    const node = graph.nodes.find(n => n.id === 'architect');
    assert.ok(node);
    assert.equal(node.currentTask, 'Designing API');
    assert.equal(node.phase, 'thinking');
  });

  it('should infer workstream from parent chain', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'backend-lead', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'backend-lead', event: 'subagent-invoked', detail: '@developer: Build login' },
      { ts: '2026-04-10T10:02:00Z', agent: 'developer', event: 'spawned' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const graph = cache.getGraph();
    const blNode = graph.nodes.find(n => n.id === 'backend-lead');
    const devNode = graph.nodes.find(n => n.id === 'developer');
    assert.ok(blNode);
    assert.ok(devNode);
    // backend-lead is root, so its workstream is itself
    assert.equal(blNode.workstream, 'backend-lead');
    // developer's parent is backend-lead, so workstream traces to backend-lead
    assert.equal(devNode.workstream, 'backend-lead');
    // workstreams array should contain backend-lead
    assert.ok(graph.workstreams.includes('backend-lead'));
  });

  it('should return multiple workstreams for parallel workflows', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'backend-lead', event: 'spawned' },
      { ts: '2026-04-10T10:00:00Z', agent: 'frontend-lead', event: 'spawned' },
      { ts: '2026-04-10T10:01:00Z', agent: 'backend-lead', event: 'subagent-invoked', detail: '@developer: Build API' },
      { ts: '2026-04-10T10:01:00Z', agent: 'developer', event: 'spawned' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const graph = cache.getGraph();
    assert.ok(graph.workstreams.includes('backend-lead'));
    assert.ok(graph.workstreams.includes('frontend-lead'));
    assert.equal(graph.workstreams.length, 2);
  });

  it('should include phase and lastHeartbeat in agent state shape', () => {
    const dir = tmpDir();
    const events = [
      { ts: '2026-04-10T10:00:00Z', agent: 'architect', event: 'spawned' },
    ];
    writeEvents(dir, events);

    const cache = new EventCache(path.join(dir, 'events.jsonl'));
    caches.push(cache);

    const agents = cache.getActiveAgents();
    const arch = agents.find(a => a.agent === 'architect');
    assert.ok(arch);
    assert.ok('phase' in arch);
    assert.ok('lastHeartbeat' in arch);
    assert.equal(arch.phase, null);
    assert.equal(arch.lastHeartbeat, null);
  });
});
