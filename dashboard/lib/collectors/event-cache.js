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
        phase: null,
        lastHeartbeat: null,
      };
    }

    const state = this._agentState[name];
    state.lastEvent = evt.event;
    state.lastEventTime = evt.ts;

    switch (evt.event) {
      case 'spawned':
        state.status = 'active';
        state.branch = null;
        state.plan = null;
        state.tasksCompleted = 0;
        state.tasksTotal = 0;
        state.currentTask = null;
        state.phase = null;
        state.lastHeartbeat = null;
        break;
      case 'heartbeat':
        state.status = 'working';
        state.currentTask = evt.detail || 'Working...';
        state.phase = evt.phase || null;
        state.lastHeartbeat = evt.ts;
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
    const name = evt.agent;

    // On spawn, prune completed/idle nodes and orphaned edges
    if (evt.event === 'spawned') {
      this._graph.nodes = this._graph.nodes.filter(n => {
        const s = this._agentState[n.id];
        return s && s.status !== 'completed' && s.status !== 'idle';
      });
      const activeIds = new Set(this._graph.nodes.map(n => n.id));
      this._graph.edges = this._graph.edges.filter(e =>
        activeIds.has(e.from) && activeIds.has(e.to)
      );
    }

    // Ensure the agent node exists
    if (!this._graph.nodes.find(n => n.id === name)) {
      this._graph.nodes.push({
        id: name,
        status: this._agentState[name] ? this._agentState[name].status : 'idle',
        icon: ICONS[name] || '🤖',
        currentTask: null,
        phase: null,
      });
    } else {
      // Update status + enrichment on existing node
      const node = this._graph.nodes.find(n => n.id === name);
      if (this._agentState[name]) {
        node.status = this._agentState[name].status;
        node.currentTask = this._agentState[name].currentTask || null;
        node.phase = this._agentState[name].phase || null;
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
            currentTask: null,
            phase: null,
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

  _isStale(agentName, maxAgeMs = 60000) {
    const state = this._agentState[agentName];
    if (!state || !state.lastHeartbeat) return false;
    return (Date.now() - new Date(state.lastHeartbeat).getTime()) > maxAgeMs;
  }

  getActiveAgents() {
    return Object.values(this._agentState).map(agent => {
      const copy = { ...agent };
      if (copy.status === 'working' && this._isStale(copy.agent)) {
        copy.status = 'active';
      }
      return copy;
    });
  }

  getGraph() {
    const nodes = this._graph.nodes.map(n => {
      const copy = { ...n };
      // Annotate with workstream
      const agentState = this._agentState[n.id];
      if (agentState && agentState.workstream) {
        copy.workstream = agentState.workstream;
      } else {
        // Trace parent chain to find root
        copy.workstream = this._inferWorkstream(n.id);
      }
      return copy;
    });
    const workstreams = [...new Set(nodes.map(n => n.workstream).filter(Boolean))];
    return {
      nodes,
      edges: this._graph.edges.slice(),
      workstreams,
    };
  }

  _inferWorkstream(agentId) {
    // Find root ancestor by tracing edges backwards
    const visited = new Set();
    let current = agentId;
    while (!visited.has(current)) {
      visited.add(current);
      const parentEdge = this._graph.edges.find(e => e.to === current);
      if (!parentEdge) break;
      current = parentEdge.from;
    }
    return current;
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
