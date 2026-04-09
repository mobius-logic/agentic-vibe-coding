// dashboard/test/collectors.test.js
// Unit tests for data collector modules

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { readEvents, getRecentEvents, getActiveAgents } = require('../lib/collectors/events');
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
