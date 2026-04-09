// dashboard/lib/collectors/plans.js
// Parses .plans/*.md files to extract plan metadata and task lists

'use strict';

const fs = require('fs');
const path = require('path');

const PLANS_DIR = path.resolve(__dirname, '..', '..', '..', '.plans');

/**
 * Parse a plan markdown file and extract metadata + tasks.
 */
function parsePlanFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const plan = {
    file: path.relative(path.resolve(__dirname, '..', '..', '..'), filePath),
    title: '',
    date: '',
    status: '',
    lead: '',
    branch: '',
    tasks: [],
  };

  // Extract title from first H1
  const titleLine = lines.find(l => l.startsWith('# '));
  if (titleLine) {
    plan.title = titleLine.replace(/^#\s+/, '').replace(/^Plan:\s*/i, '').trim();
  }

  // Extract metadata from bold key-value pairs
  for (const line of lines) {
    const match = line.match(/^\s*-\s*\*\*(\w[\w\s]*)\*\*\s*:\s*(.+)/);
    if (match) {
      const key = match[1].toLowerCase().trim();
      const value = match[2].trim();
      if (key === 'date') plan.date = value;
      if (key === 'status') plan.status = value;
      if (key === 'lead') plan.lead = value;
      if (key === 'branch') plan.branch = value;
    }
  }

  // Extract tasks from numbered lists under ## Tasks or ## Acceptance Criteria
  let inTaskSection = false;
  for (const line of lines) {
    if (/^##\s+(Tasks|Acceptance Criteria|Workstream)/i.test(line)) {
      inTaskSection = true;
      continue;
    }
    if (inTaskSection && line.startsWith('## ')) {
      inTaskSection = false;
      continue;
    }
    if (inTaskSection) {
      const taskMatch = line.match(/^\s*\d+\.\s+(.+)/);
      if (taskMatch) {
        const text = taskMatch[1].trim();
        // Check for checkbox syntax: - [x] or 1. [x]
        const checked = /^\[x\]/i.test(text);
        plan.tasks.push({
          text: text.replace(/^\[[ x]\]\s*/i, ''),
          completed: checked,
        });
      }
    }
  }

  return plan;
}

/**
 * Read all plans from .plans/ directory.
 */
function getAllPlans(plansDir) {
  const dir = plansDir || PLANS_DIR;

  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .sort();

  return files.map(f => parsePlanFile(path.join(dir, f))).filter(Boolean);
}

module.exports = { parsePlanFile, getAllPlans };
