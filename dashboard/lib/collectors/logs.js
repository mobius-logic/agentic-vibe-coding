// dashboard/lib/collectors/logs.js
// Parses .agent-logs/*.md files to extract session entries

'use strict';

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.resolve(__dirname, '..', '..', '..', '.agent-logs');

/**
 * Parse an agent log markdown file and extract session entries.
 */
function parseLogFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  const agentName = path.basename(filePath, '.md')
    .replace(/-log$/, '')
    .replace(/-/g, ' ');

  const entries = [];
  const sections = content.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n');
    const header = lines[0] || '';

    // Parse timestamp from header: "2026-04-09 14:30:22 — Session Summary"
    const tsMatch = header.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    if (!tsMatch) continue;

    const entry = {
      timestamp: tsMatch[1],
      agent: agentName,
      branch: '',
      plan: '',
      status: '',
      tasks: [],
      filesChanged: [],
    };

    for (const line of lines) {
      const kvMatch = line.match(/^\s*-\s*\*\*([^*]+)\*\*\s*:\s*(.+)/);
      if (kvMatch) {
        const key = kvMatch[1].toLowerCase().trim();
        const value = kvMatch[2].trim();

        if (key === 'branch') entry.branch = value;
        if (key.includes('plan') || key.includes('architecture')) entry.plan = value;
        if (key === 'status') entry.status = value;
        if (key === 'files changed') {
          entry.filesChanged = value.split(',').map(f => f.trim()).filter(Boolean);
        }
      }

      // Parse task items
      const taskMatch = line.match(/^\s*-\s+(?!\*\*)(.+)/);
      if (taskMatch && !line.includes('**')) {
        entry.tasks.push(taskMatch[1].trim());
      }
    }

    entries.push(entry);
  }

  return { agent: agentName, entries };
}

/**
 * Read all agent logs from .agent-logs/ directory.
 */
function getAllLogs(logsDir) {
  const dir = logsDir || LOGS_DIR;

  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort();

  return files.map(f => parseLogFile(path.join(dir, f))).filter(Boolean);
}

/**
 * Get a specific agent's log.
 */
function getAgentLog(agentName, logsDir) {
  const dir = logsDir || LOGS_DIR;
  const fileName = `${agentName}-log.md`;
  const filePath = path.join(dir, fileName);
  return parseLogFile(filePath);
}

module.exports = { parseLogFile, getAllLogs, getAgentLog };
