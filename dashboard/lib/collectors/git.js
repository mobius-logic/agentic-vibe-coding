// dashboard/lib/collectors/git.js
// Reads git branch and status information via child_process

'use strict';

const { execSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Execute a git command and return trimmed stdout.
 * Returns empty string on error.
 */
function git(args, cwd) {
  try {
    return execSync(`git ${args}`, {
      cwd: cwd || REPO_ROOT,
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Get the current branch name.
 */
function getCurrentBranch() {
  return git('rev-parse --abbrev-ref HEAD');
}

/**
 * Get all local branches with metadata.
 * Returns array of { name, current, lastCommit, lastCommitDate, isFeature, isFix }
 */
function getLocalBranches() {
  const raw = git('branch --format="%(refname:short)|%(HEAD)|%(objectname:short)|%(creatordate:iso8601)"');
  if (!raw) return [];

  return raw.split('\n').filter(Boolean).map(line => {
    // Remove surrounding quotes if present
    const clean = line.replace(/^"|"$/g, '');
    const [name, head, commit, date] = clean.split('|');
    return {
      name: name || '',
      current: head === '*',
      lastCommit: commit || '',
      lastCommitDate: date || '',
      isFeature: (name || '').startsWith('feature/'),
      isFix: (name || '').startsWith('fix/'),
    };
  });
}

/**
 * Get remote branches (feature/* and fix/* only).
 */
function getRemoteBranches() {
  const raw = git('branch -r --format="%(refname:short)|%(objectname:short)|%(creatordate:iso8601)"');
  if (!raw) return [];

  return raw.split('\n').filter(Boolean).map(line => {
    const clean = line.replace(/^"|"$/g, '');
    const [name, commit, date] = clean.split('|');
    return {
      name: (name || '').replace(/^origin\//, ''),
      remote: true,
      lastCommit: commit || '',
      lastCommitDate: date || '',
      isFeature: (name || '').includes('feature/'),
      isFix: (name || '').includes('fix/'),
    };
  }).filter(b => b.isFeature || b.isFix);
}

/**
 * Get all feature/fix branches with merged status.
 */
function getAllBranches() {
  const local = getLocalBranches().filter(b => b.isFeature || b.isFix);
  const remote = getRemoteBranches();
  const mergedRaw = git('branch --merged main --format="%(refname:short)"');
  const merged = new Set(mergedRaw ? mergedRaw.split('\n').map(s => s.replace(/^"|"$/g, '').trim()) : []);

  const branchMap = new Map();

  for (const b of local) {
    branchMap.set(b.name, {
      ...b,
      local: true,
      remote: false,
      merged: merged.has(b.name),
      status: merged.has(b.name) ? 'merged' : 'active',
    });
  }

  for (const b of remote) {
    if (branchMap.has(b.name)) {
      branchMap.get(b.name).remote = true;
    } else {
      branchMap.set(b.name, {
        ...b,
        local: false,
        remote: true,
        merged: merged.has(b.name),
        status: merged.has(b.name) ? 'merged' : 'remote',
      });
    }
  }

  return Array.from(branchMap.values());
}

module.exports = { getCurrentBranch, getLocalBranches, getRemoteBranches, getAllBranches, git };
