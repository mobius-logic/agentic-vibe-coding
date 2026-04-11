// dashboard/test/collectors.test.js
// Unit tests for data collector modules

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { readEvents, getRecentEvents, getActiveAgents, getAgentGraph } = require('../lib/collectors/events');
const { parsePlanFile, getAllPlans } = require('../lib/collectors/plans');
const { parseLogFile } = require('../lib/collectors/logs');

const FIXTURES = path.join(__dirname, 'fixtures');

// ── Events Collector ───────────────────────────────────────

describe('events collector', () => {
  const eventsFile = path.join(FIXTURES, 'sample-events.jsonl');

  it('reads all events from JSONL file', () => {
    const events = readEvents(eventsFile);
    assert.ok(events.length > 0, 'should have events');
    assert.equal(events[0].agent, 'backend-lead');
    assert.equal(events[0].event, 'spawned');
  });

  it('returns empty array for missing file', () => {
    const events = readEvents('/nonexistent/path/events.jsonl');
    assert.deepEqual(events, []);
  });

  it('getRecentEvents limits results', () => {
    const events = getRecentEvents(3, eventsFile);
    assert.ok(events.length <= 3);
  });

  it('getActiveAgents derives agent states', () => {
    const agents = getActiveAgents(eventsFile);
    assert.ok(agents.length >= 2, 'should have at least 2 agents');

    const backendLead = agents.find(a => a.agent === 'backend-lead');
    assert.ok(backendLead, 'should have backend-lead');
    assert.equal(backendLead.tasksCompleted, 1);
    assert.equal(backendLead.tasksTotal, 3);

    const developer = agents.find(a => a.agent === 'developer');
    assert.ok(developer, 'should have developer');
    assert.equal(developer.status, 'completed');
  });

  it('handles empty events file gracefully', () => {
    const tmpFile = path.join(os.tmpdir(), `empty-events-${Date.now()}.jsonl`);
    fs.writeFileSync(tmpFile, '', 'utf8');
    try {
      const events = readEvents(tmpFile);
      assert.deepEqual(events, []);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('getAgentGraph returns nodes and edges', () => {
    const graph = getAgentGraph(eventsFile);
    assert.ok(graph.nodes, 'should have nodes');
    assert.ok(graph.edges, 'should have edges');
    assert.ok(Array.isArray(graph.nodes));
    assert.ok(Array.isArray(graph.edges));
    assert.ok(graph.nodes.length >= 2, 'should have at least 2 nodes');
  });

  it('getAgentGraph nodes have id, status, icon', () => {
    const graph = getAgentGraph(eventsFile);
    for (const node of graph.nodes) {
      assert.ok(node.id, 'node should have id');
      assert.ok(node.status, 'node should have status');
      assert.ok(node.icon, 'node should have icon');
    }
  });

  it('getAgentGraph extracts edges from subagent-invoked events', () => {
    const graph = getAgentGraph(eventsFile);
    // The sample-events.jsonl has a subagent-invoked event: detail "developer"
    const edge = graph.edges.find(e => e.to === 'developer');
    assert.ok(edge, 'should have edge to developer');
    assert.equal(edge.from, 'backend-lead');
  });

  it('getAgentGraph parses detail format @agent: task', () => {
    const tmpFile = path.join(os.tmpdir(), `graph-events-${Date.now()}.jsonl`);
    const events = [
      JSON.stringify({ ts: '2026-04-10T10:00:00Z', agent: 'backend-lead', event: 'spawned' }),
      JSON.stringify({ ts: '2026-04-10T10:01:00Z', agent: 'backend-lead', event: 'subagent-invoked', detail: '@developer: Write login' }),
      JSON.stringify({ ts: '2026-04-10T10:02:00Z', agent: 'developer', event: 'spawned' }),
    ].join('\n') + '\n';
    fs.writeFileSync(tmpFile, events, 'utf8');
    try {
      const graph = getAgentGraph(tmpFile);
      assert.equal(graph.edges.length, 1);
      assert.equal(graph.edges[0].from, 'backend-lead');
      assert.equal(graph.edges[0].to, 'developer');
      assert.equal(graph.edges[0].task, 'Write login');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('getAgentGraph returns empty for missing file', () => {
    const graph = getAgentGraph('/nonexistent/events.jsonl');
    assert.deepEqual(graph.nodes, []);
    assert.deepEqual(graph.edges, []);
  });

  it('getActiveAgents resets state on re-spawn', () => {
    const tmpFile = path.join(os.tmpdir(), `respawn-events-${Date.now()}.jsonl`);
    const events = [
      JSON.stringify({ ts: '2026-04-10T10:00:00Z', agent: 'architect', event: 'spawned' }),
      JSON.stringify({ ts: '2026-04-10T10:01:00Z', agent: 'architect', event: 'branch-created', branch: 'feature/arch/x' }),
      JSON.stringify({ ts: '2026-04-10T10:02:00Z', agent: 'architect', event: 'plan-loaded', plan: '.plans/test.md', taskTotal: 5 }),
      JSON.stringify({ ts: '2026-04-10T10:03:00Z', agent: 'architect', event: 'task-completed', taskTotal: 5 }),
      JSON.stringify({ ts: '2026-04-10T10:04:00Z', agent: 'architect', event: 'session-complete' }),
      JSON.stringify({ ts: '2026-04-10T11:00:00Z', agent: 'architect', event: 'spawned' }),
    ].join('\n') + '\n';
    fs.writeFileSync(tmpFile, events, 'utf8');
    try {
      const agents = getActiveAgents(tmpFile);
      const arch = agents.find(a => a.agent === 'architect');
      assert.ok(arch);
      assert.equal(arch.status, 'active');
      assert.equal(arch.branch, null);
      assert.equal(arch.plan, null);
      assert.equal(arch.tasksCompleted, 0);
      assert.equal(arch.tasksTotal, 0);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('getActiveAgents handles heartbeat events', () => {
    const tmpFile = path.join(os.tmpdir(), `heartbeat-events-${Date.now()}.jsonl`);
    const events = [
      JSON.stringify({ ts: '2026-04-10T10:00:00Z', agent: 'architect', event: 'spawned' }),
      JSON.stringify({ ts: '2026-04-10T10:01:00Z', agent: 'architect', event: 'heartbeat', detail: 'Reading files', phase: 'searching' }),
    ].join('\n') + '\n';
    fs.writeFileSync(tmpFile, events, 'utf8');
    try {
      const agents = getActiveAgents(tmpFile);
      const arch = agents.find(a => a.agent === 'architect');
      assert.ok(arch);
      assert.equal(arch.status, 'working');
      assert.equal(arch.currentTask, 'Reading files');
      assert.equal(arch.phase, 'searching');
      assert.equal(arch.lastHeartbeat, '2026-04-10T10:01:00Z');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('getActiveAgents includes phase and lastHeartbeat in state shape', () => {
    const tmpFile = path.join(os.tmpdir(), `shape-events-${Date.now()}.jsonl`);
    const events = [
      JSON.stringify({ ts: '2026-04-10T10:00:00Z', agent: 'architect', event: 'spawned' }),
    ].join('\n') + '\n';
    fs.writeFileSync(tmpFile, events, 'utf8');
    try {
      const agents = getActiveAgents(tmpFile);
      const arch = agents.find(a => a.agent === 'architect');
      assert.ok(arch);
      assert.ok('phase' in arch);
      assert.ok('lastHeartbeat' in arch);
      assert.equal(arch.phase, null);
      assert.equal(arch.lastHeartbeat, null);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

// ── Plans Collector ────────────────────────────────────────

describe('plans collector', () => {
  it('parses a plan markdown file', () => {
    const plan = parsePlanFile(path.join(FIXTURES, 'sample-plan.md'));
    assert.ok(plan, 'should return a plan');
    assert.equal(plan.title, 'Sample Auth Feature');
    assert.equal(plan.status, 'approved');
    assert.equal(plan.lead, 'backend-lead');
    assert.equal(plan.branch, 'feature/backend/auth');
    assert.equal(plan.tasks.length, 3);
    assert.equal(plan.tasks[0].text, 'Implement JWT middleware');
  });

  it('returns null for missing file', () => {
    const plan = parsePlanFile('/nonexistent/plan.md');
    assert.equal(plan, null);
  });

  it('getAllPlans reads from a directory', () => {
    // Create a temp dir with a plan
    const tmpDir = path.join(os.tmpdir(), `plans-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.copyFileSync(
      path.join(FIXTURES, 'sample-plan.md'),
      path.join(tmpDir, '2026-04-09-test.md')
    );
    // Add a README.md that should be skipped
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Plans', 'utf8');

    try {
      const plans = getAllPlans(tmpDir);
      assert.equal(plans.length, 1);
      assert.equal(plans[0].title, 'Sample Auth Feature');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});

// ── Logs Collector ─────────────────────────────────────────

describe('logs collector', () => {
  it('parses an agent log file', () => {
    const log = parseLogFile(path.join(FIXTURES, 'sample-log.md'));
    assert.ok(log, 'should return a log');
    assert.ok(log.entries.length > 0);
    assert.equal(log.entries[0].timestamp, '2026-04-09 14:30:22');
    assert.equal(log.entries[0].branch, 'feature/backend/auth');
    assert.equal(log.entries[0].status, 'done');
  });

  it('returns null for missing file', () => {
    const log = parseLogFile('/nonexistent/log.md');
    assert.equal(log, null);
  });
});
