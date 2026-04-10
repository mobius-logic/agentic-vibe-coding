// dashboard/lib/collectors/events.js
// Reads and parses .agent-events/events.jsonl

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_EVENTS_FILE = path.resolve(__dirname, '..', '..', '..', '.agent-events', 'events.jsonl');

/**
 * Read all events from the JSONL file.
 * Returns an array of parsed event objects, newest last.
 * Gracefully returns [] if file or directory is missing.
 */
function readEvents(eventsFile) {
  const filePath = eventsFile || DEFAULT_EVENTS_FILE;

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];

  const events = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines
    }
  }
  return events;
}

/**
 * Get recent events (last N).
 */
function getRecentEvents(limit = 50, eventsFile) {
  const all = readEvents(eventsFile);
  return all.slice(-limit);
}

/**
 * Derive active agents from events.
 * An agent is "active" if it has a "spawned" event without a matching "session-complete".
 */
function getActiveAgents(eventsFile) {
  const events = readEvents(eventsFile);
  const agentState = {};

  for (const evt of events) {
    const name = evt.agent;
    if (!agentState[name]) {
      agentState[name] = {
        agent: name,
        status: 'idle',
        branch: null,
        plan: null,
        tasksCompleted: 0,
        tasksTotal: 0,
        lastEvent: null,
        lastEventTime: null,
      };
    }

    const state = agentState[name];
    state.lastEvent = evt.event;
    state.lastEventTime = evt.ts;

    switch (evt.event) {
      case 'spawned':
        state.status = 'active';
        break;
      case 'plan-loaded':
      case 'plan-saved':
        state.plan = evt.plan || null;
        if (evt.taskTotal) state.tasksTotal = evt.taskTotal;
        break;
      case 'branch-created':
        state.branch = evt.branch || null;
        break;
      case 'task-started':
        state.status = 'working';
        if (evt.branch) state.branch = evt.branch;
        if (evt.taskTotal) state.tasksTotal = evt.taskTotal;
        state.currentTask = evt.task || null;
        break;
      case 'task-completed':
        state.tasksCompleted++;
        if (evt.taskTotal) state.tasksTotal = evt.taskTotal;
        state.currentTask = null;
        break;
      case 'question-asked':
        state.status = 'working';
        state.currentTask = evt.detail || 'Asking questions';
        break;
      case 'subagent-invoked':
        state.status = 'working';
        state.currentTask = evt.detail || 'Invoking subagent';
        break;
      case 'session-complete':
        state.status = 'completed';
        state.currentTask = null;
        break;
      case 'error':
        state.status = 'error';
        break;
    }
  }

  return Object.values(agentState);
}

const ICONS = {
  'architect': '🏗️',
  'backend-lead': '⚙️',
  'frontend-lead': '🎨',
  'infra-lead': '🔧',
  'developer': '💻',
  'tester': '🧪',
  'code-reviewer': '🔍',
  'docs-writer': '📝',
};

function getAgentGraph(eventsFile) {
  const events = readEvents(eventsFile);
  const agents = getActiveAgents(eventsFile);
  const agentMap = {};
  for (const a of agents) {
    agentMap[a.agent] = a;
  }

  const nodes = agents.map(a => ({
    id: a.agent,
    status: a.status,
    icon: ICONS[a.agent] || '🤖',
  }));

  const edges = [];
  const detailRegex = /^@?([a-z-]+)(?::\s*(.+))?$/;
  for (const evt of events) {
    if (evt.event === 'subagent-invoked' && evt.detail) {
      const match = evt.detail.match(detailRegex);
      if (match) {
        edges.push({
          from: evt.agent,
          to: match[1],
          task: match[2] || null,
        });
      }
    }
  }

  return { nodes, edges };
}

module.exports = { readEvents, getRecentEvents, getActiveAgents, getAgentGraph };
