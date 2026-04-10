// dashboard/server.js
// Zero-dependency HTTP server for the Agent Monitor Dashboard.
// Serves static files from public/ and exposes REST API endpoints.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { getRecentEvents, getActiveAgents, getAgentGraph } = require('./lib/collectors/events');
const { getAllBranches, getCurrentBranch } = require('./lib/collectors/git');
const { getAllPlans } = require('./lib/collectors/plans');
const { getAllLogs, getAgentLog } = require('./lib/collectors/logs');
const { getActivitySnapshot } = require('./lib/collectors/activity');
const { EventCache } = require('./lib/collectors/event-cache');

const PUBLIC_DIR = path.join(__dirname, 'public');

// --- SSE Client Management ---
const sseClients = new Set();

function broadcastToSSE(newEvents) {
  const data = JSON.stringify(newEvents);
  for (const client of sseClients) {
    client.write(`event: events\ndata: ${data}\n\n`);
  }
}

// --- EventCache Instance ---
const eventCache = new EventCache(null, broadcastToSSE);

// --- Activity Snapshot TTL Cache ---
let activityCache = null;
let activityCacheTime = 0;
const ACTIVITY_CACHE_TTL = 5000;

function getCachedActivity() {
  const now = Date.now();
  if (!activityCache || (now - activityCacheTime) > ACTIVITY_CACHE_TTL) {
    activityCache = getActivitySnapshot();
    activityCacheTime = now;
  }
  return activityCache;
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Send a JSON response.
 */
function json(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

/**
 * Serve a static file from public/.
 */
function serveStatic(res, filePath) {
  const safePath = path.normalize(filePath);
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(safePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': data.length,
    });
    res.end(data);
  });
}

/**
 * API route handlers.
 */
const apiHandlers = {
  '/api/agents'(_req, res) {
    const agents = getActiveAgents();
    const activity = getCachedActivity();

    // Build set of agents known from events (any status)
    const knownAgents = new Set(agents.map(a => a.agent));

    // Only add inferred agents that are NOT already known from events
    const inferredSet = new Set(activity.inferredActiveAgents);
    for (const name of inferredSet) {
      if (!knownAgents.has(name)) {
        agents.push({
          agent: name,
          status: 'active',
          branch: null,
          plan: null,
          tasksCompleted: 0,
          tasksTotal: 0,
          lastEvent: 'inferred-from-logs',
          lastEventTime: activity.timestamp,
        });
      }
    }

    json(res, agents);
  },

  '/api/branches'(_req, res) {
    const branches = getAllBranches();
    const current = getCurrentBranch();
    json(res, { current, branches });
  },

  '/api/plans'(_req, res) {
    const plans = getAllPlans();
    json(res, plans);
  },

  '/api/events'(_req, res, query) {
    const limit = parseInt(query.limit, 10) || 50;
    const events = eventCache.getEvents(limit);
    json(res, events);
  },

  '/api/logs'(_req, res) {
    const logs = getAllLogs();
    json(res, logs);
  },

  '/api/activity'(_req, res) {
    const activity = getCachedActivity();
    json(res, activity);
  },

  '/api/graph'(_req, res) {
    const graph = eventCache.getGraph();
    json(res, graph);
  },

  '/api/stream'(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('event: connected\ndata: {}\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
  },

  '/api/summary'(_req, res) {
    const agents = getActiveAgents();
    const branches = getAllBranches();
    const plans = getAllPlans();
    const events = getRecentEvents(100);
    const activity = getCachedActivity();

    // Include inferred agents in count
    const knownAgentNames = new Set(agents.map(a => a.agent));

    const activeCount = agents.filter(a => a.status !== 'completed' && a.status !== 'idle').length
      + activity.inferredActiveAgents.filter(n => !knownAgentNames.has(n)).length;
    const completedCount = agents.filter(a => a.status === 'completed').length;

    // Add unknown inferred agents to total count
    for (const name of activity.inferredActiveAgents) {
      if (!knownAgentNames.has(name)) knownAgentNames.add(name);
    }

    let totalTasks = 0;
    let completedTasks = 0;
    for (const plan of plans) {
      totalTasks += plan.tasks.length;
      completedTasks += plan.tasks.filter(t => t.completed).length;
    }

    json(res, {
      agents: { total: knownAgentNames.size, active: activeCount, completed: completedCount },
      branches: {
        total: branches.length,
        active: branches.filter(b => b.status === 'active').length,
        merged: branches.filter(b => b.status === 'merged').length,
      },
      tasks: { total: totalTasks, completed: completedTasks },
      recentEventsCount: events.length,
      activity: {
        status: activity.status,
        level: activity.activityLevel,
        workingTreeChanges: activity.workingTreeChanges.length,
        recentCommits: activity.recentCommits.length,
      },
    });
  },
};

/**
 * Handle an incoming HTTP request.
 */
function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    // Handle /api/logs/:agent
    const logMatch = pathname.match(/^\/api\/logs\/([a-zA-Z0-9_-]+)$/);
    if (logMatch) {
      const agentLog = getAgentLog(logMatch[1]);
      if (agentLog) {
        json(res, agentLog);
      } else {
        json(res, { error: 'Agent log not found' }, 404);
      }
      return;
    }

    const handler = apiHandlers[pathname];
    if (handler) {
      handler(req, res, parsed.query || {});
      return;
    }

    json(res, { error: 'Not found' }, 404);
    return;
  }

  // Static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent path traversal
  filePath = path.join(PUBLIC_DIR, path.normalize(filePath));
  serveStatic(res, filePath);
}

/**
 * Create and return the HTTP server (does not start listening).
 * Exported for testing.
 */
function createServer() {
  return http.createServer(handleRequest);
}

module.exports = { createServer, handleRequest, eventCache, sseClients };
