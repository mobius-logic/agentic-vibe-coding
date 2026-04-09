// Agent Monitor Dashboard — Frontend Logic
// Polls the dashboard API and renders live data.

'use strict';

const API_BASE = '';
const REFRESH_INTERVAL = 3000;

let refreshTimer = null;

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

function eventTypeLabel(type) {
  const labels = {
    'spawned': '🟢 spawned',
    'plan-loaded': '📋 plan loaded',
    'task-started': '▶️ task started',
    'task-completed': '✅ task done',
    'branch-created': '🌿 branch created',
    'branch-pushed': '📤 branch pushed',
    'subagent-invoked': '🔗 subagent',
    'session-complete': '🏁 session done',
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

function renderSummary(data) {
  if (!data) return;
  document.getElementById('summary-agents').textContent =
    `${data.agents.active}/${data.agents.total}`;
  document.getElementById('summary-branches').textContent =
    `${data.branches.total}`;
  document.getElementById('summary-tasks').textContent =
    data.tasks.total > 0 ? `${data.tasks.completed}/${data.tasks.total}` : '0';
  document.getElementById('summary-events').textContent =
    `${data.recentEventsCount}`;
}

function renderAgents(agents) {
  const grid = document.getElementById('agents-grid');
  if (!agents || agents.length === 0) {
    grid.innerHTML = '<div class="empty-state">No agent activity yet. Agents will appear here when they are spawned.</div>';
    return;
  }

  grid.innerHTML = agents.map(agent => {
    const pct = agent.tasksTotal > 0
      ? Math.round((agent.tasksCompleted / agent.tasksTotal) * 100)
      : 0;
    return `
      <div class="agent-card">
        <div class="agent-card-header">
          <span class="agent-name">${escapeHtml(agent.agent)}</span>
          <span class="agent-icon">${agentIcon(agent.agent)}</span>
        </div>
        <span class="status-badge ${statusClass(agent.status)}">● ${escapeHtml(agent.status)}</span>
        <div class="agent-meta">
          ${agent.branch ? `<span>🌿 ${escapeHtml(agent.branch)}</span>` : ''}
          ${agent.plan ? `<span>📋 ${escapeHtml(agent.plan)}</span>` : ''}
          ${agent.lastEventTime ? `<span>🕐 ${formatTime(agent.lastEventTime)}</span>` : ''}
        </div>
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
        ${evt.branch ? `<span class="branch-name">${escapeHtml(evt.branch)}</span>` : ''}
      </span>
    </div>
  `).join('');
}

// ── Main Refresh Loop ──────────────────────────────────────

async function refresh() {
  const statusEl = document.getElementById('connection-status');

  try {
    const [summary, agents, branches, plans, events] = await Promise.all([
      fetchJSON('/api/summary'),
      fetchJSON('/api/agents'),
      fetchJSON('/api/branches'),
      fetchJSON('/api/plans'),
      fetchJSON('/api/events?limit=100'),
    ]);

    renderSummary(summary);
    renderAgents(agents);
    renderBranches(branches);
    renderPlans(plans);
    renderEvents(events);

    statusEl.textContent = '● Live';
    statusEl.className = 'status-badge status-active';
  } catch {
    statusEl.textContent = '● Disconnected';
    statusEl.className = 'status-badge status-error';
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, REFRESH_INTERVAL);
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

  // Initial fetch
  refresh();
  startAutoRefresh();
});
