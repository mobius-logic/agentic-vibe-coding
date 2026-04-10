// dashboard/lib/collectors/event-cache.js
// Caches parsed events from .agent-events/events.jsonl with fs.watch for incremental reads.

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_EVENTS_DIR = path.resolve(__dirname, '..', '..', '..', '.agent-events');
const DEFAULT_EVENTS_FILE = path.join(DEFAULT_EVENTS_DIR, 'events.jsonl');

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

const DETAIL_REGEX = /^@?([a-z-]+)(?::\s*(.+))?$/;

class EventCache {
  constructor(eventsFile, onNewEvents) {
    this._eventsFile = eventsFile || DEFAULT_EVENTS_FILE;
    this._eventsDir = path.dirname(this._eventsFile);
    this._onNewEvents = onNewEvents || null;
    this._events = [];
    this._byteOffset = 0;
    this._agentState = {};
    this._graph = { nodes: [], edges: [] };
    this._watcher = null;
    this._debounceTimer = null;

    this._initialLoad();
    this._startWatching();
  }

  _initialLoad() {
    if (!fs.existsSync(this._eventsFile)) {
      return;
    }

    const content = fs.readFileSync(this._eventsFile, 'utf8');
    this._byteOffset = Buffer.byteLength(content, 'utf8');
    this._parseAndAppend(content);
  }

  _startWatching() {
    if (!fs.existsSync(this._eventsDir)) {
      return;
    }

    try {
      this._watcher = fs.watch(this._eventsDir, () => {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._readNewBytes(), 100);
      });
    } catch {
      // fs.watch may not be available on all platforms
    }
  }

  _readNewBytes() {
    if (!fs.existsSync(this._eventsFile)) return;

    let fd;
    try {
      const stat = fs.statSync(this._eventsFile);
      const fileSize = stat.size;
      if (fileSize <= this._byteOffset) return;

      const bytesToRead = fileSize - this._byteOffset;
      const buffer = Buffer.alloc(bytesToRead);
      fd = fs.openSync(this._eventsFile, 'r');
      fs.readSync(fd, buffer, 0, bytesToRead, this._byteOffset);
      fs.closeSync(fd);
      fd = null;

      this._byteOffset = fileSize;
      const newContent = buffer.toString('utf8');
      const newEvents = this._parseAndAppend(newContent);

      if (newEvents.length > 0 && this._onNewEvents) {
        this._onNewEvents(newEvents);
      }
    } catch {
      // Gracefully handle read errors
      if (fd) {
        try { fs.closeSync(fd); } catch { /* ignore */ }
      }
    }
  }

  _parseAndAppend(content) {
    const trimmed = content.trim();
    if (!trimmed) return [];

    const newEvents = [];
    for (const line of trimmed.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      try {
        const evt = JSON.parse(l);
        this._events.push(evt);
        newEvents.push(evt);
        this._updateAgentState(evt);
        this._updateGraph(evt);
      } catch {
        // Skip malformed lines
      }
    }
    return newEvents;
  }

  _updateAgentState(evt) {
    const name = evt.agent;
    if (!this._agentState[name]) {
      this._agentState[name] = {
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

    const state = this._agentState[name];
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

  _updateGraph(evt) {
    // Ensure the agent node exists
    const name = evt.agent;
    if (!this._graph.nodes.find(n => n.id === name)) {
      this._graph.nodes.push({
        id: name,
        status: this._agentState[name] ? this._agentState[name].status : 'idle',
        icon: ICONS[name] || '🤖',
      });
    } else {
      // Update status on existing node
      const node = this._graph.nodes.find(n => n.id === name);
      if (this._agentState[name]) {
        node.status = this._agentState[name].status;
      }
    }

    // Add edges for subagent-invoked events
    if (evt.event === 'subagent-invoked' && evt.detail) {
      const match = evt.detail.match(DETAIL_REGEX);
      if (match) {
        const childName = match[1];
        // Ensure child node exists
        if (!this._graph.nodes.find(n => n.id === childName)) {
          this._graph.nodes.push({
            id: childName,
            status: this._agentState[childName] ? this._agentState[childName].status : 'idle',
            icon: ICONS[childName] || '🤖',
          });
        }
        this._graph.edges.push({
          from: evt.agent,
          to: childName,
          task: match[2] || null,
        });
      }
    }
  }

  getEvents(limit) {
    if (limit) {
      return this._events.slice(-limit);
    }
    return this._events.slice();
  }

  getActiveAgents() {
    return Object.values(this._agentState);
  }

  getGraph() {
    return {
      nodes: this._graph.nodes.slice(),
      edges: this._graph.edges.slice(),
    };
  }

  destroy() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }
}

module.exports = { EventCache };
