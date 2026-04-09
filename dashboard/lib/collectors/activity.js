// dashboard/lib/collectors/activity.js
// Monitors filesystem activity to detect real-time agent work.
// Scans recently modified files in key directories to infer active sessions.

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Get recently modified files in a directory (recursive, last N minutes).
 */
function getRecentFiles(dir, minutesAgo = 5) {
  const absDir = path.resolve(REPO_ROOT, dir);
  if (!fs.existsSync(absDir)) return [];

  const cutoff = Date.now() - (minutesAgo * 60 * 1000);
  const results = [];

  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.gitkeep') continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        try {
          const stat = fs.statSync(full);
          if (stat.mtimeMs > cutoff) {
            results.push({
              file: path.relative(REPO_ROOT, full).replace(/\\/g, '/'),
              modified: stat.mtime.toISOString(),
              size: stat.size,
            });
          }
        } catch { /* skip */ }
      }
    }
  }

  walk(absDir);
  return results.sort((a, b) => b.modified.localeCompare(a.modified));
}

/**
 * Get git working tree changes (staged + unstaged).
 */
function getWorkingTreeChanges() {
  try {
    const status = execSync('git status --porcelain', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!status) return [];

    return status.split('\n').filter(Boolean).map(line => {
      const statusCode = line.slice(0, 2).trim();
      const file = line.slice(3).trim();
      let type = 'modified';
      if (statusCode.includes('A') || statusCode === '??') type = 'added';
      if (statusCode.includes('D')) type = 'deleted';
      if (statusCode.includes('R')) type = 'renamed';
      return { file, type, statusCode };
    });
  } catch {
    return [];
  }
}

/**
 * Get recent git commits (last N minutes).
 */
function getRecentCommits(minutesAgo = 30) {
  try {
    const since = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
    const output = execSync(
      `git log --all --since="${since}" --format="%H|%h|%s|%an|%aI|%D" --no-merges`,
      { cwd: REPO_ROOT, encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!output) return [];

    return output.split('\n').filter(Boolean).map(line => {
      const [hash, shortHash, subject, author, date, refs] = line.split('|');
      return { hash, shortHash, subject, author, date, refs: refs || '' };
    });
  } catch {
    return [];
  }
}

/**
 * Build a comprehensive activity snapshot.
 */
function getActivitySnapshot() {
  const recentAgentLogs = getRecentFiles('.agent-logs', 10);
  const recentPlans = getRecentFiles('.plans', 10);
  const recentEvents = getRecentFiles('.agent-events', 2);
  const workingTree = getWorkingTreeChanges();
  const recentCommits = getRecentCommits(30);

  // Infer which agents are likely active based on log file changes
  const activeAgentNames = new Set();
  for (const f of recentAgentLogs) {
    const match = f.file.match(/\.agent-logs\/([a-z-]+)-log\.md$/);
    if (match) activeAgentNames.add(match[1]);
  }

  // Count active indicators
  const activityLevel = recentAgentLogs.length + recentPlans.length +
    recentEvents.length + workingTree.length + recentCommits.length;

  let status = 'idle';
  if (activityLevel > 10) status = 'very-active';
  else if (activityLevel > 3) status = 'active';
  else if (activityLevel > 0) status = 'light';

  return {
    status,
    activityLevel,
    inferredActiveAgents: Array.from(activeAgentNames),
    recentLogChanges: recentAgentLogs,
    recentPlanChanges: recentPlans,
    recentEventWrites: recentEvents,
    workingTreeChanges: workingTree,
    recentCommits,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getRecentFiles, getWorkingTreeChanges, getRecentCommits, getActivitySnapshot };
