// dashboard/test/state.test.js
// Tests for SessionState class

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { SessionState } = require('../lib/state');

describe('SessionState', () => {
  it('should initialize with empty state', () => {
    const state = new SessionState();
    const s = state.getState();
    assert.equal(s.sessionStart, null);
    assert.equal(s.planPath, null);
    assert.deepEqual(s.agents, {});
    assert.deepEqual(s.graph.nodes, []);
    assert.deepEqual(s.graph.edges, []);
    assert.equal(s.eventCount, 0);
  });

  it('should process spawned event and add agent to graph', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'architect', event: 'spawned', parent: '' });
    const s = state.getState();
    assert.equal(s.agents.architect.status, 'active');
    assert.equal(s.agents.architect.spawnedAt, '2026-01-01T00:00:00Z');
    assert.equal(s.graph.nodes.length, 1);
    assert.equal(s.graph.nodes[0].id, 'architect');
  });

  it('should build parent-child edges from spawned events', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'architect', event: 'spawned', parent: '' });
    state.processEvent({ ts: '2026-01-01T00:01:00Z', agent: 'frontend-lead', event: 'spawned', parent: 'architect' });
    const g = state.getGraph();
    assert.equal(g.edges.length, 1);
    assert.equal(g.edges[0].from, 'architect');
    assert.equal(g.edges[0].to, 'frontend-lead');
  });

  it('should handle session-start by resetting state', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'architect', event: 'spawned' });
    state.processEvent({ ts: '2026-01-01T01:00:00Z', agent: 'architect', event: 'session-start', plan: '.plans/test.md' });
    const s = state.getState();
    assert.equal(s.sessionStart, '2026-01-01T01:00:00Z');
    assert.equal(s.planPath, '.plans/test.md');
    assert.equal(s.eventCount, 1); // only the session-start event remains
  });

  it('should track task-started and task-completed', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'dev', event: 'task-started', task: 'Build API', taskIndex: 1, taskTotal: 5 });
    let s = state.getState();
    assert.equal(s.agents.dev.currentTask, 'Build API');
    assert.equal(s.agents.dev.taskIndex, 1);
    assert.equal(s.agents.dev.taskTotal, 5);
    assert.equal(s.agents.dev.status, 'active');

    state.processEvent({ ts: '2026-01-01T00:01:00Z', agent: 'dev', event: 'task-completed', task: 'Build API', taskIndex: 1, taskTotal: 5 });
    s = state.getState();
    assert.equal(s.agents.dev.currentTask, null);
  });

  it('should track todo-update events', () => {
    const state = new SessionState();
    const todos = [
      { id: 1, title: 'Write tests', status: 'in-progress' },
      { id: 2, title: 'Build UI', status: 'not-started' },
    ];
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'dev', event: 'todo-update', todos });
    const s = state.getState();
    assert.deepEqual(s.agents.dev.todos, todos);
  });

  it('should track branch-created events', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'lead', event: 'branch-created', branch: 'feature/test' });
    const s = state.getState();
    assert.equal(s.agents.lead.branch, 'feature/test');
  });

  it('should track thinking events', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'architect', event: 'thinking', detail: 'Designing API' });
    const s = state.getState();
    assert.equal(s.agents.architect.thinkingSummary, 'Designing API');
    assert.equal(s.agents.architect.status, 'active');
  });

  it('should track session-complete events', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'dev', event: 'spawned' });
    state.processEvent({ ts: '2026-01-01T00:01:00Z', agent: 'dev', event: 'session-complete', status: 'done' });
    const s = state.getState();
    assert.equal(s.agents.dev.status, 'completed');
  });

  it('should track error events', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'dev', event: 'error', detail: 'Build failed' });
    const s = state.getState();
    assert.equal(s.agents.dev.status, 'error');
    assert.equal(s.agents.dev.thinkingSummary, 'Build failed');
  });

  it('should build graph edges from subagent-invoked events', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'lead', event: 'subagent-invoked', detail: '@developer: build feature' });
    const g = state.getGraph();
    assert.ok(g.edges.find((e) => e.from === 'lead' && e.to === 'developer'));
  });

  it('should return agent detail with filtered events', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'dev', event: 'spawned' });
    state.processEvent({ ts: '2026-01-01T00:01:00Z', agent: 'other', event: 'spawned' });
    state.processEvent({ ts: '2026-01-01T00:02:00Z', agent: 'dev', event: 'task-started', task: 'Test' });
    const detail = state.getAgentDetail('dev');
    assert.equal(detail.name, 'dev');
    assert.equal(detail.events.length, 2); // only dev's events
  });

  it('should return null for unknown agent detail', () => {
    const state = new SessionState();
    assert.equal(state.getAgentDetail('nonexistent'), null);
  });

  it('should handle plan-loaded event and set planPath', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'arch', event: 'plan-loaded', plan: '.plans/foo.md' });
    const s = state.getState();
    assert.equal(s.planPath, '.plans/foo.md');
    assert.equal(s.agents.arch.plan, '.plans/foo.md');
  });

  it('should not duplicate graph nodes', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'dev', event: 'spawned' });
    state.processEvent({ ts: '2026-01-01T00:01:00Z', agent: 'dev', event: 'task-started', task: 'Test' });
    const g = state.getGraph();
    const devNodes = g.nodes.filter((n) => n.id === 'dev');
    assert.equal(devNodes.length, 1);
  });

  it('should not duplicate graph edges', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'lead', event: 'subagent-invoked', detail: '@dev: task1' });
    state.processEvent({ ts: '2026-01-01T00:01:00Z', agent: 'lead', event: 'subagent-invoked', detail: '@dev: task2' });
    const g = state.getGraph();
    const edges = g.edges.filter((e) => e.from === 'lead' && e.to === 'dev');
    assert.equal(edges.length, 1);
  });

  it('should fully reset on reset()', () => {
    const state = new SessionState();
    state.processEvent({ ts: '2026-01-01T00:00:00Z', agent: 'dev', event: 'spawned' });
    state.processEvent({ ts: '2026-01-01T00:01:00Z', agent: 'dev', event: 'todo-update', todos: [{ id: 1, title: 'x', status: 'completed' }] });
    state.reset();
    const s = state.getState();
    assert.deepEqual(s.agents, {});
    assert.equal(s.graph.nodes.length, 0);
    assert.equal(s.eventCount, 0);
    assert.equal(s.sessionStart, null);
  });

  it('should ignore events with missing agent or event fields', () => {
    const state = new SessionState();
    state.processEvent(null);
    state.processEvent({});
    state.processEvent({ agent: 'dev' });
    state.processEvent({ event: 'spawned' });
    assert.equal(state.getState().eventCount, 0);
  });
});
