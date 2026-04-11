// Agent Monitor Dashboard — Frontend Logic
// Polls the dashboard API and renders live data.

'use strict';

const API_BASE = '';
const FAST_POLL = 3000;
const SLOW_POLL = 10000;

let refreshTimer = null;
let eventSource = null;

// ── Utility ────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString.slice(11, 19);
  }
}

function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return dateString.slice(0, 10);
  }
}

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function statusClass(status) {
  switch (status) {
    case 'active': return 'status-active';
    case 'working': return 'status-working';
    case 'completed': return 'status-completed';
    case 'error': return 'status-error';
    case 'merged': return 'status-merged';
    default: return 'status-idle';
  }
}

function agentIcon(name) {
  const icons = {
    'architect': '🏗️',
    'backend-lead': '⚙️',
    'frontend-lead': '🎨',
    'infra-lead': '🔧',
    'developer': '💻',
    'tester': '🧪',
    'code-reviewer': '🔍',
    'docs-writer': '📝',
  };
  return icons[name] || '🤖';
}

function phaseIcon(phase) {
  const icons = {
    'thinking': '💭',
    'coding': '⌨️',
    'searching': '🔍',
    'reviewing': '📋',
    'waiting': '⏳',
    'delegating': '🔗',
  };
  return icons[phase] || '';
}

function eventTypeLabel(type) {
  const labels = {
    'spawned': '🟢 spawned',
    'plan-loaded': '📋 plan loaded',
    'plan-saved': '📋 plan saved',
    'task-started': '▶️ task started',
    'task-completed': '✅ task done',
    'branch-created': '🌿 branch created',
    'branch-pushed': '📤 branch pushed',
    'subagent-invoked': '🔗 subagent',
    'question-asked': '❓ question',
    'session-complete': '🏁 session done',
    'heartbeat': '💓 heartbeat',
    'error': '❌ error',
  };
  return labels[type] || type;
}

// ── API Calls ──────────────────────────────────────────────

async function fetchJSON(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Renderers ──────────────────────────────────────────────

function renderSummary(data, graphData, agents) {
  if (!data) return;

  // C4: Show workstream count when >1
  const wsCount = (graphData && graphData.workstreams) ? graphData.workstreams.length : 0;
  const agentText = `${data.agents.active}/${data.agents.total}`;
  document.getElementById('summary-agents').textContent =
    wsCount > 1 ? `${agentText} · ${wsCount} ws` : agentText;

  document.getElementById('summary-branches').textContent =
    `${data.branches.total}`;
  document.getElementById('summary-tasks').textContent =
    data.tasks.total > 0 ? `${data.tasks.completed}/${data.tasks.total}` : '0';
  document.getElementById('summary-events').textContent =
    `${data.recentEventsCount}`;

  // Activity indicator + B6: Last signal from heartbeats
  const actEl = document.getElementById('summary-activity');
  let lastSignal = '';
  if (agents && agents.length > 0) {
    let newest = null;
    for (const a of agents) {
      if (a.lastHeartbeat) {
        const t = new Date(a.lastHeartbeat).getTime();
        if (!newest || t > newest) newest = t;
      }
    }
    if (newest) {
      const secsAgo = Math.floor((Date.now() - newest) / 1000);
      lastSignal = secsAgo < 60 ? `${secsAgo}s ago` : secsAgo < 3600 ? `${Math.floor(secsAgo / 60)}m ago` : `${Math.floor(secsAgo / 3600)}h ago`;
    }
  }

  if (data.activity) {
    const s = data.activity.status;
    const label = s === 'very-active' ? 'Very Active' : s === 'active' ? 'Active' : s === 'light' ? 'Light' : 'Idle';
    const signalHtml = lastSignal ? `<br><span style="font-size:10px;color:#9d9d9d">Signal: ${lastSignal}</span>` : '';
    actEl.innerHTML = `<span class="activity-badge"><span class="activity-dot ${s}"></span> ${label}</span>${signalHtml}`;
  } else {
    actEl.textContent = lastSignal ? `Idle · ${lastSignal}` : 'Idle';
  }
}

function renderAgents(agents, events) {
  const grid = document.getElementById('agents-grid');
  if (!agents || agents.length === 0) {
    grid.innerHTML = '<div class="empty-state">No agent activity yet. Agents will appear here when they are spawned.</div>';
    return;
  }

  // B5: Find latest task-started/heartbeat event per agent for "current task" display
  const currentTasks = {};
  const currentPhases = {};
  if (events) {
    for (const evt of events) {
      if (evt.event === 'task-started' || evt.event === 'question-asked' || evt.event === 'heartbeat') {
        currentTasks[evt.agent] = evt.task || evt.detail || '';
        if (evt.phase) currentPhases[evt.agent] = evt.phase;
      }
      if (evt.event === 'task-completed' || evt.event === 'session-complete') {
        delete currentTasks[evt.agent];
        delete currentPhases[evt.agent];
      }
    }
  }

  grid.innerHTML = agents.map(agent => {
    const pct = agent.tasksTotal > 0
      ? Math.round((agent.tasksCompleted / agent.tasksTotal) * 100)
      : 0;
    const isActive = agent.status === 'active' || agent.status === 'working';
    const cardClass = agent.status === 'working' ? 'is-working' : (isActive ? 'is-active' : '');
    const currentTask = currentTasks[agent.agent];
    const phase = agent.phase || currentPhases[agent.agent];
    const pEmoji = phaseIcon(phase);

    return `
      <div class="agent-card ${cardClass}">
        <div class="agent-card-header">
          <span class="agent-name">${escapeHtml(agent.agent)}</span>
          <span class="agent-icon">${agentIcon(agent.agent)}</span>
        </div>
        <span class="status-badge ${statusClass(agent.status)}${isActive ? ' pulse-active' : ''}">● ${escapeHtml(agent.status)}</span>
        <div class="agent-meta">
          ${agent.branch ? `<span>🌿 ${escapeHtml(agent.branch)}</span>` : ''}
          ${agent.plan ? `<span>📋 ${escapeHtml(agent.plan)}</span>` : ''}
          ${agent.lastEventTime ? `<span>🕐 ${timeAgo(agent.lastEventTime)}</span>` : ''}
        </div>
        ${currentTask ? `<div class="agent-current-task">${pEmoji ? pEmoji + ' ' : '▶ '}${escapeHtml(currentTask)}</div>` : ''}
        ${agent.tasksTotal > 0 ? `
          <div class="agent-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${pct}%"></div>
            </div>
            <div class="progress-text">${agent.tasksCompleted}/${agent.tasksTotal} tasks (${pct}%)</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderActivity(activity) {
  // Working tree changes
  const wtEl = document.getElementById('working-tree');
  if (!activity || !activity.workingTreeChanges || activity.workingTreeChanges.length === 0) {
    wtEl.innerHTML = '<div class="empty-state">No uncommitted changes.</div>';
  } else {
    wtEl.innerHTML = activity.workingTreeChanges.map(f => `
      <div class="activity-item">
        <span class="activity-type ${f.type}">${escapeHtml(f.type)}</span>
        <span class="activity-file">${escapeHtml(f.file)}</span>
      </div>
    `).join('');
  }

  // Recent commits
  const cmEl = document.getElementById('recent-commits');
  if (!activity || !activity.recentCommits || activity.recentCommits.length === 0) {
    cmEl.innerHTML = '<div class="empty-state">No recent commits.</div>';
  } else {
    cmEl.innerHTML = activity.recentCommits.map(c => `
      <div class="commit-item">
        <div>
          <span class="commit-hash">${escapeHtml(c.shortHash)}</span>
          <span class="commit-message">${escapeHtml(c.subject)}</span>
        </div>
        <div class="commit-meta">${escapeHtml(c.author || '')} · ${timeAgo(c.date)}${c.refs ? ` · ${escapeHtml(c.refs)}` : ''}</div>
      </div>
    `).join('');
  }
}

function renderBranches(branchData) {
  const tbody = document.getElementById('branches-tbody');
  if (!branchData || !branchData.branches || branchData.branches.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No feature branches found.</td></tr>';
    return;
  }

  tbody.innerHTML = branchData.branches.map(b => `
    <tr>
      <td><span class="branch-name">${escapeHtml(b.name)}</span></td>
      <td><span class="status-badge ${statusClass(b.status)}">● ${escapeHtml(b.status)}</span></td>
      <td><code>${escapeHtml(b.lastCommit || '—')}</code></td>
      <td>${formatDate(b.lastCommitDate)}</td>
    </tr>
  `).join('');
}

function renderPlans(plans) {
  const container = document.getElementById('plans-container');
  if (!plans || plans.length === 0) {
    container.innerHTML = '<div class="empty-state">No plans found in .plans/ directory.</div>';
    return;
  }

  container.innerHTML = plans.map(plan => {
    const completedCount = plan.tasks.filter(t => t.completed).length;
    const totalCount = plan.tasks.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return `
      <div class="plan-card">
        <div class="plan-header">
          <span class="plan-title">${escapeHtml(plan.title || 'Untitled Plan')}</span>
          <span class="status-badge ${plan.status === 'approved' ? 'status-active' : 'status-idle'}">
            ${escapeHtml(plan.status || 'unknown')}
          </span>
        </div>
        <div class="plan-file">${escapeHtml(plan.file)}</div>
        ${plan.date ? `<div class="plan-file">📅 ${escapeHtml(plan.date)}</div>` : ''}
        ${totalCount > 0 ? `
          <div class="agent-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${pct}%"></div>
            </div>
            <div class="progress-text">${completedCount}/${totalCount} tasks (${pct}%)</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderEvents(events) {
  const container = document.getElementById('events-timeline');
  if (!events || events.length === 0) {
    container.innerHTML = '<div class="empty-state">No events recorded yet. Events will appear as agents work.</div>';
    return;
  }

  // Show newest first
  const reversed = [...events].reverse();
  container.innerHTML = reversed.map(evt => `
    <div class="event-row">
      <span class="event-time">${formatTime(evt.ts)}</span>
      <span class="event-agent">${escapeHtml(evt.agent)}</span>
      <span class="event-detail">
        <span class="event-type">${eventTypeLabel(evt.event)}</span>
        ${evt.task ? escapeHtml(evt.task) : ''}
        ${evt.detail ? escapeHtml(evt.detail) : ''}
        ${evt.branch ? `<span class="branch-name">${escapeHtml(evt.branch)}</span>` : ''}
      </span>
    </div>
  `).join('');
}

// ── Graph Renderer ─────────────────────────────────────────

function renderGraph(graphData) {
  const container = document.getElementById('agents-graph');
  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    container.innerHTML = '<div class="empty-state">No agent relationships yet. Invoke subagents to see the graph.</div>';
    return;
  }

  const { nodes, edges } = graphData;
  const workstreams = graphData.workstreams || [];
  const multiWorkstream = workstreams.length > 1;

  // Build adjacency and find roots (nodes never appearing as edge target)
  const childSet = new Set(edges.map(e => e.to));
  const roots = nodes.filter(n => !childSet.has(n.id));
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);

  // BFS to assign levels
  const levels = {};
  const adj = {};
  for (const e of edges) {
    if (!adj[e.from]) adj[e.from] = [];
    adj[e.from].push(e.to);
  }
  const queue = roots.map(r => ({ id: r.id, level: 0 }));
  const visited = new Set();
  while (queue.length > 0) {
    const { id, level } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    levels[id] = level;
    if (adj[id]) {
      for (const child of adj[id]) {
        if (!visited.has(child)) queue.push({ id: child, level: level + 1 });
      }
    }
  }
  for (const n of nodes) {
    if (levels[n.id] === undefined) levels[n.id] = 0;
  }

  // Layout constants
  const nodeW = 140;
  const padX = 20, padY = 30;
  const containerWidth = container.clientWidth || 800;

  // Status colors
  const statusColors = {
    'active': '#4ec9b0', 'working': '#4fc1ff', 'completed': '#608b4e',
    'idle': '#6a6a6a', 'error': '#f44747',
  };

  // Workstream accent colors for edges
  const wsColors = ['#4fc1ff', '#4ec9b0', '#ce9178', '#c586c0', '#dcdcaa', '#f44747'];
  const wsColorMap = {};
  workstreams.forEach((ws, i) => { wsColorMap[ws] = wsColors[i % wsColors.length]; });

  // Node lookup by id
  const nodeById = {};
  for (const n of nodes) nodeById[n.id] = n;

  // Helper: render a single enriched node
  function renderNode(n, pos) {
    const color = statusColors[n.status] || '#6a6a6a';
    const isWorking = n.status === 'working';
    const pEmoji = phaseIcon(n.phase);
    const nodeHt = pos.h;
    let g = `<g class="graph-node${isWorking ? ' graph-node-working' : ''}">`;
    g += `<rect x="${pos.x}" y="${pos.y}" width="${nodeW}" height="${nodeHt}" rx="8" ry="8" fill="#252526" stroke="${color}" stroke-width="2"/>`;
    const nameY = n.currentTask ? pos.y + 24 : pos.y + nodeHt / 2 + 5;
    g += `<text class="graph-label" x="${pos.x + nodeW / 2}" y="${nameY}" text-anchor="middle" fill="#cccccc" font-size="12">${pEmoji ? pEmoji + ' ' : ''}${n.icon || '🤖'} ${escapeHtml(n.id)}</text>`;
    if (n.currentTask) {
      const taskText = n.currentTask.length > 20 ? n.currentTask.slice(0, 20) + '…' : n.currentTask;
      g += `<text class="graph-label" x="${pos.x + nodeW / 2}" y="${pos.y + 48}" text-anchor="middle" fill="#9d9d9d" font-size="10">${escapeHtml(taskText)}</text>`;
    }
    g += `</g>`;
    return g;
  }

  const positions = {};
  let svgH, maxLevel = 0;

  // Find global max level
  for (const n of nodes) {
    if (levels[n.id] > maxLevel) maxLevel = levels[n.id];
  }

  if (multiWorkstream) {
    // C3: Group nodes by workstream
    const wsByName = {};
    for (const n of nodes) {
      const ws = n.workstream || 'default';
      if (!wsByName[ws]) wsByName[ws] = [];
      wsByName[ws].push(n);
    }
    const wsKeys = workstreams.filter(ws => wsByName[ws] && wsByName[ws].length > 0);
    // Include any workstreams not in the declared list
    for (const k of Object.keys(wsByName)) {
      if (!wsKeys.includes(k)) wsKeys.push(k);
    }

    const colWidth = Math.floor((containerWidth - padX * 2) / wsKeys.length);
    const levelH = 100;
    const labelOffset = 24;

    for (let wi = 0; wi < wsKeys.length; wi++) {
      const wsNodes = wsByName[wsKeys[wi]] || [];
      const byLevel = {};
      for (const n of wsNodes) {
        const lvl = levels[n.id];
        if (!byLevel[lvl]) byLevel[lvl] = [];
        byLevel[lvl].push(n);
      }
      const colStart = padX + wi * colWidth;
      for (const lvlStr of Object.keys(byLevel)) {
        const lvl = parseInt(lvlStr, 10);
        const row = byLevel[lvl];
        const totalW = row.length * nodeW + (row.length - 1) * 20;
        let startX = colStart + (colWidth - totalW) / 2;
        if (startX < colStart) startX = colStart;
        row.forEach((n, i) => {
          positions[n.id] = {
            x: startX + i * (nodeW + 20),
            y: padY + labelOffset + lvl * levelH,
            h: n.currentTask ? 70 : 50,
          };
        });
      }
    }

    svgH = (maxLevel + 1) * levelH + padY * 2 + labelOffset;

    // Build SVG with workstream markers
    let markerDefs = '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#6a6a6a"/></marker>';
    wsKeys.forEach((ws, i) => {
      const c = wsColorMap[ws] || wsColors[i % wsColors.length];
      markerDefs += `<marker id="arrow-ws${i}" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="${c}"/></marker>`;
    });

    let svg = `<svg width="100%" height="${svgH}" viewBox="0 0 ${containerWidth} ${svgH}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs>${markerDefs}</defs>`;

    // Draw workstream labels and dividers
    for (let wi = 0; wi < wsKeys.length; wi++) {
      const colStart = padX + wi * colWidth;
      const wsColor = wsColorMap[wsKeys[wi]] || wsColors[wi % wsColors.length];
      svg += `<text x="${colStart + colWidth / 2}" y="${padY + 12}" text-anchor="middle" fill="${wsColor}" font-size="11" font-weight="600" opacity="0.7">${escapeHtml(wsKeys[wi])}</text>`;
      if (wi > 0) {
        svg += `<line x1="${colStart}" y1="${padY}" x2="${colStart}" y2="${svgH - padY}" stroke="#3c3c3c" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>`;
      }
    }

    // Draw edges with workstream accent colors
    for (const e of edges) {
      const from = positions[e.from];
      const to = positions[e.to];
      if (!from || !to) continue;
      const fromNode = nodeById[e.from];
      const toNode = nodeById[e.to];
      const fromWs = fromNode ? fromNode.workstream : null;
      const wsIdx = wsKeys.indexOf(fromWs);
      const edgeColor = (wsIdx >= 0) ? (wsColorMap[fromWs] || '#6a6a6a') : '#6a6a6a';
      const markerId = (wsIdx >= 0) ? `arrow-ws${wsIdx}` : 'arrowhead';
      const isCross = fromNode && toNode && fromNode.workstream !== toNode.workstream;
      const x1 = from.x + nodeW / 2, y1 = from.y + from.h;
      const x2 = to.x + nodeW / 2, y2 = to.y;
      svg += `<line class="graph-edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${edgeColor}" stroke-width="2" ${isCross ? 'stroke-dasharray="6,3"' : ''} marker-end="url(#${markerId})">`;
      if (e.task) svg += `<title>${escapeHtml(e.task)}</title>`;
      svg += `</line>`;
    }

    // Draw nodes
    for (const n of nodes) {
      const pos = positions[n.id];
      if (pos) svg += renderNode(n, pos);
    }

    svg += `</svg>`;
    container.innerHTML = svg;
  } else {
    // Single workstream — centered layout with enriched nodes
    const byLevel = {};
    for (const n of nodes) {
      const lvl = levels[n.id];
      if (!byLevel[lvl]) byLevel[lvl] = [];
      byLevel[lvl].push(n);
    }

    const levelH = 100;
    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const row = byLevel[lvl] || [];
      const totalW = row.length * nodeW + (row.length - 1) * 30;
      let startX = (containerWidth - totalW) / 2;
      if (startX < padX) startX = padX;
      row.forEach((n, i) => {
        positions[n.id] = {
          x: startX + i * (nodeW + 30),
          y: padY + lvl * levelH,
          h: n.currentTask ? 70 : 50,
        };
      });
    }

    svgH = (maxLevel + 1) * levelH + padY * 2;

    let svg = `<svg width="100%" height="${svgH}" viewBox="0 0 ${containerWidth} ${svgH}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#6a6a6a"/></marker></defs>`;

    // Draw edges
    for (const e of edges) {
      const from = positions[e.from];
      const to = positions[e.to];
      if (!from || !to) continue;
      const x1 = from.x + nodeW / 2, y1 = from.y + from.h;
      const x2 = to.x + nodeW / 2, y2 = to.y;
      svg += `<line class="graph-edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6a6a6a" stroke-width="2" marker-end="url(#arrowhead)">`;
      if (e.task) svg += `<title>${escapeHtml(e.task)}</title>`;
      svg += `</line>`;
    }

    // Draw enriched nodes
    for (const n of nodes) {
      const pos = positions[n.id];
      if (pos) svg += renderNode(n, pos);
    }

    svg += `</svg>`;
    container.innerHTML = svg;
  }
}

// ── View Toggle ────────────────────────────────────────────

function initViewToggle() {
  const gridBtn = document.getElementById('view-grid');
  const graphBtn = document.getElementById('view-graph');
  const grid = document.getElementById('agents-grid');
  const graph = document.getElementById('agents-graph');

  const saved = localStorage.getItem('agent-view') || 'grid';
  if (saved === 'graph') {
    gridBtn.classList.remove('active');
    graphBtn.classList.add('active');
    grid.style.display = 'none';
    graph.style.display = 'block';
  }

  gridBtn.addEventListener('click', () => {
    gridBtn.classList.add('active');
    graphBtn.classList.remove('active');
    grid.style.display = '';
    graph.style.display = 'none';
    localStorage.setItem('agent-view', 'grid');
  });

  graphBtn.addEventListener('click', () => {
    graphBtn.classList.add('active');
    gridBtn.classList.remove('active');
    grid.style.display = 'none';
    graph.style.display = 'block';
    localStorage.setItem('agent-view', 'graph');
  });
}

// ── SSE Connection ─────────────────────────────────────────

function connectSSE() {
  if (eventSource) eventSource.close();
  try {
    eventSource = new EventSource(`${API_BASE}/api/stream`);

    eventSource.addEventListener('events', () => {
      refresh();
    });

    eventSource.addEventListener('connected', () => {
      // Switch to slow polling since SSE handles real-time updates
      startAutoRefresh();
    });

    eventSource.onerror = () => {
      eventSource.close();
      eventSource = null;
      // Fall back to fast polling
      startAutoRefresh();
    };
  } catch {
    eventSource = null;
  }
}

// ── Main Refresh Loop ──────────────────────────────────────

async function refresh() {
  const statusEl = document.getElementById('connection-status');

  try {
    const [summary, agents, branches, plans, events, activity, graphData] = await Promise.all([
      fetchJSON('/api/summary'),
      fetchJSON('/api/agents'),
      fetchJSON('/api/branches'),
      fetchJSON('/api/plans'),
      fetchJSON('/api/events?limit=100'),
      fetchJSON('/api/activity'),
      fetchJSON('/api/graph'),
    ]);

    renderSummary(summary, graphData, agents);
    renderAgents(agents, events);
    renderGraph(graphData);
    renderActivity(activity);
    renderBranches(branches);
    renderPlans(plans);
    renderEvents(events);

    statusEl.textContent = eventSource ? '● Live (SSE)' : '● Live';
    statusEl.className = 'status-badge status-active';
  } catch {
    statusEl.textContent = '● Disconnected';
    statusEl.className = 'status-badge status-error';
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  const interval = eventSource ? SLOW_POLL : FAST_POLL;
  refreshTimer = setInterval(refresh, interval);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// ── Init ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('auto-refresh');

  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  initViewToggle();
  connectSSE();

  // Initial fetch
  refresh();
  startAutoRefresh();
});
