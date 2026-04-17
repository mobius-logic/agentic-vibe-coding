// dashboard/lib/state.js
// SessionState — in-memory state machine that processes events and maintains
// agent map, spawn graph, and session metadata.

'use strict';

class SessionState {
  constructor() {
    this.reset();
  }

  reset() {
    this.agents = new Map();
    this.graphNodes = [];
    this.graphEdges = [];
    this.sessionStart = null;
    this.planPath = null;
    this.events = [];
  }

  processEvent(evt) {
    if (!evt || !evt.agent || !evt.event) return;

    this.events.push(evt);

    if (evt.event === 'session-start') {
      this.reset();
      this.events.push(evt);
      this.sessionStart = evt.ts;
      this.planPath = evt.plan || null;
      this._ensureAgent(evt.agent);
      this._setAgentField(evt.agent, 'status', 'active');
      return;
    }

    this._ensureAgent(evt.agent);

    switch (evt.event) {
      case 'spawned':
        this._setAgentField(evt.agent, 'status', 'active');
        this._setAgentField(evt.agent, 'spawnedAt', evt.ts);
        if (evt.parent !== undefined) {
          this._setAgentField(evt.agent, 'parent', evt.parent);
        }
        this._addGraphNode(evt.agent);
        if (evt.parent) {
          this._addGraphEdge(evt.parent, evt.agent);
        }
        if (!this.sessionStart) {
          this.sessionStart = evt.ts;
        }
        break;

      case 'thinking':
        this._setAgentField(evt.agent, 'status', 'active');
        this._setAgentField(evt.agent, 'thinkingSummary', evt.detail || '');
        break;

      case 'todo-update':
        if (Array.isArray(evt.todos)) {
          this._setAgentField(evt.agent, 'todos', evt.todos);
        }
        break;

      case 'task-started':
        this._setAgentField(evt.agent, 'status', 'active');
        this._setAgentField(evt.agent, 'currentTask', evt.task || '');
        this._setAgentField(evt.agent, 'taskIndex', evt.taskIndex);
        this._setAgentField(evt.agent, 'taskTotal', evt.taskTotal);
        break;

      case 'task-completed':
        this._setAgentField(evt.agent, 'currentTask', null);
        this._setAgentField(evt.agent, 'taskIndex', evt.taskIndex);
        this._setAgentField(evt.agent, 'taskTotal', evt.taskTotal);
        break;

      case 'branch-created':
        this._setAgentField(evt.agent, 'branch', evt.branch || '');
        break;

      case 'subagent-invoked':
        this._setAgentField(evt.agent, 'status', 'active');
        if (evt.detail) {
          const match = evt.detail.match(/@([\w-]+)/);
          if (match) {
            const childName = match[1];
            this._addGraphEdge(evt.agent, childName);
          }
        }
        break;

      case 'plan-loaded':
      case 'plan-saved':
        if (evt.plan) {
          this._setAgentField(evt.agent, 'plan', evt.plan);
          if (!this.planPath) this.planPath = evt.plan;
        }
        break;

      case 'session-complete':
        this._setAgentField(evt.agent, 'status', evt.status === 'error' ? 'error' : 'completed');
        break;

      case 'error':
        this._setAgentField(evt.agent, 'status', 'error');
        this._setAgentField(evt.agent, 'thinkingSummary', evt.detail || 'Error');
        break;

      case 'question-asked':
        this._setAgentField(evt.agent, 'status', 'active');
        this._setAgentField(evt.agent, 'thinkingSummary', evt.detail || 'Asked a question');
        break;

      default:
        break;
    }
  }

  getState() {
    const agents = {};
    for (const [name, data] of this.agents) {
      agents[name] = { ...data };
    }
    return {
      sessionStart: this.sessionStart,
      planPath: this.planPath,
      agents,
      graph: this.getGraph(),
      eventCount: this.events.length,
    };
  }

  getGraph() {
    return {
      nodes: [...this.graphNodes],
      edges: [...this.graphEdges],
    };
  }

  getAgentDetail(name) {
    const agent = this.agents.get(name);
    if (!agent) return null;

    const agentEvents = this.events.filter((e) => e.agent === name);
    return {
      ...agent,
      name,
      events: agentEvents,
    };
  }

  _ensureAgent(name) {
    if (!this.agents.has(name)) {
      this.agents.set(name, {
        name,
        status: 'idle',
        branch: null,
        plan: null,
        spawnedAt: null,
        currentTask: null,
        taskIndex: null,
        taskTotal: null,
        todos: [],
        thinkingSummary: null,
        parent: null,
      });
      this._addGraphNode(name);
    }
  }

  _setAgentField(name, field, value) {
    const agent = this.agents.get(name);
    if (agent) {
      agent[field] = value;
    }
  }

  _addGraphNode(name) {
    if (!this.graphNodes.find((n) => n.id === name)) {
      this.graphNodes.push({ id: name });
    }
  }

  _addGraphEdge(from, to) {
    const exists = this.graphEdges.find(
      (e) => e.from === from && e.to === to
    );
    if (!exists) {
      this._addGraphNode(from);
      this._addGraphNode(to);
      this.graphEdges.push({ from, to });
    }
  }
}

module.exports = { SessionState };
