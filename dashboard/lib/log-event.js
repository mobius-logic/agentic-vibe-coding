// dashboard/lib/log-event.js
// Lightweight event logger for agents to write structured events to .agent-events/events.jsonl
// Zero dependencies — uses only Node.js built-in modules.

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_EVENTS_DIR = path.resolve(__dirname, '..', '..', '.agent-events');
const DEFAULT_EVENTS_FILE = path.join(DEFAULT_EVENTS_DIR, 'events.jsonl');

/**
 * Append a structured event to the JSONL event log.
 *
 * @param {object} opts
 * @param {string} opts.agent       - Agent name (e.g. "backend-lead")
 * @param {string} opts.event       - Event type (e.g. "spawned", "task-completed")
 * @param {string} [opts.branch]    - Git branch name
 * @param {string} [opts.plan]      - Path to .plans/ file
 * @param {string} [opts.task]      - Task description
 * @param {number} [opts.taskIndex] - Task number within plan
 * @param {number} [opts.taskTotal] - Total tasks in plan
 * @param {string} [opts.status]    - Status string
 * @param {string} [opts.detail]    - Freeform detail
 * @param {string} [opts.eventsFile] - Override path to events file
 */
function logAgentEvent(opts) {
  if (!opts || !opts.agent || !opts.event) {
    throw new Error('logAgentEvent requires "agent" and "event" fields');
  }

  const eventsFile = opts.eventsFile || DEFAULT_EVENTS_FILE;
  const eventsDir = path.dirname(eventsFile);

  const entry = {
    ts: new Date().toISOString(),
    agent: opts.agent,
    event: opts.event,
  };

  if (opts.branch !== undefined) entry.branch = opts.branch;
  if (opts.plan !== undefined) entry.plan = opts.plan;
  if (opts.task !== undefined) entry.task = opts.task;
  if (opts.taskIndex !== undefined) entry.taskIndex = opts.taskIndex;
  if (opts.taskTotal !== undefined) entry.taskTotal = opts.taskTotal;
  if (opts.status !== undefined) entry.status = opts.status;
  if (opts.detail !== undefined) entry.detail = opts.detail;

  if (!fs.existsSync(eventsDir)) {
    fs.mkdirSync(eventsDir, { recursive: true });
  }

  fs.appendFileSync(eventsFile, JSON.stringify(entry) + '\n', 'utf8');
  return entry;
}

module.exports = { logAgentEvent, DEFAULT_EVENTS_FILE };
