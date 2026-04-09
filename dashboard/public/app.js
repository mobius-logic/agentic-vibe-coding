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

  // Activity indicator
  const actEl = document.getElementById('summary-activity');
  if (data.activity) {
    const s = data.activity.status;
    const label = s === 'very-active' ? 'Very Active' : s === 'active' ? 'Active' : s === 'light' ? 'Light' : 'Idle';
    actEl.innerHTML = `<span class="activity-badge"><span class="activity-dot ${s}"></span> ${label}</span>`;
  } else {
    actEl.textContent = 'Idle';
  }
}

function renderAgents(agents, events) {
  const grid = document.getElementById('agents-grid');
  if (!agents || agents.length === 0) {
    grid.innerHTML = '<div class="empty-state">No agent activity yet. Agents will appear here when they are spawned.</div>';
    return;
  }

  // Find latest task-started event per agent for "current task" display
  const currentTasks = {};
  if (events) {
    for (const evt of events) {
      if (evt.event === 'task-started' || evt.event === 'question-asked') {
        currentTasks[evt.agent] = evt.task || evt.detail || '';
      }
      if (evt.event === 'task-completed' || evt.event === 'session-complete') {
        delete currentTasks[evt.agent];
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
        ${currentTask ? `<div class="agent-current-task">▶ ${escapeHtml(currentTask)}</div>` : ''}
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

// ── Main Refresh Loop ──────────────────────────────────────

async function refresh() {
  const statusEl = document.getElementById('connection-status');

  try {
    const [summary, agents, branches, plans, events, activity] = await Promise.all([
      fetchJSON('/api/summary'),
      fetchJSON('/api/agents'),
      fetchJSON('/api/branches'),
      fetchJSON('/api/plans'),
      fetchJSON('/api/events?limit=100'),
      fetchJSON('/api/activity'),
    ]);

    renderSummary(summary);
    renderAgents(agents, events);
    renderActivity(activity);
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
