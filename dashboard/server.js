// dashboard/server.js
// Zero-dependency HTTP server for the Agent Monitor Dashboard v2.
// SSE push, session state, plan viewer, static files.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const { SessionState } = require('./lib/state');
const { DEFAULT_EVENTS_FILE } = require('./lib/log-event');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PLANS_DIR = path.resolve(__dirname, '..', '.plans');
const EVENTS_FILE = DEFAULT_EVENTS_FILE;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/plain',
};

function createServer() {
  const state = new SessionState();
  const sseClients = new Set();
  let byteOffset = 0;
  let debounceTimer = null;

  // Load existing events on startup
  loadAllEvents(state);

  function loadAllEvents(sessionState) {
    try {
      if (!fs.existsSync(EVENTS_FILE)) return;
      const content = fs.readFileSync(EVENTS_FILE, 'utf8');
      byteOffset = Buffer.byteLength(content, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim());
      for (const line of lines) {
        try {
          const evt = JSON.parse(line);
          sessionState.processEvent(evt);
        } catch {
          // skip malformed lines
        }
      }
    } catch {
      // events file doesn't exist yet
    }
  }

  function readNewEvents() {
    try {
      if (!fs.existsSync(EVENTS_FILE)) return [];
      const stat = fs.statSync(EVENTS_FILE);
      if (stat.size <= byteOffset) {
        if (stat.size < byteOffset) {
          // File was truncated (session reset)
          byteOffset = 0;
        } else {
          return [];
        }
      }
      const fd = fs.openSync(EVENTS_FILE, 'r');
      const buf = Buffer.alloc(stat.size - byteOffset);
      fs.readSync(fd, buf, 0, buf.length, byteOffset);
      fs.closeSync(fd);
      byteOffset = stat.size;
      const newContent = buf.toString('utf8');
      const lines = newContent.split('\n').filter((l) => l.trim());
      const events = [];
      for (const line of lines) {
        try {
          events.push(JSON.parse(line));
        } catch {
          // skip malformed
        }
      }
      return events;
    } catch {
      return [];
    }
  }

  function handleSessionStart(evt) {
    // Truncate events.jsonl to only this event
    try {
      const eventsDir = path.dirname(EVENTS_FILE);
      if (!fs.existsSync(eventsDir)) {
        fs.mkdirSync(eventsDir, { recursive: true });
      }
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(evt) + '\n', 'utf8');
      byteOffset = Buffer.byteLength(JSON.stringify(evt) + '\n', 'utf8');
    } catch {
      // best effort
    }

    // Reset state
    state.reset();
    state.processEvent(evt);

    // Push SSE session-reset
    broadcastSSE('session-reset', { ts: evt.ts, plan: evt.plan });
  }

  function broadcastSSE(eventType, data) {
    const payload = JSON.stringify(data);
    for (const client of sseClients) {
      try {
        client.write(`event: ${eventType}\ndata: ${payload}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Watch for new events
  const eventsDir = path.dirname(EVENTS_FILE);
  if (!fs.existsSync(eventsDir)) {
    fs.mkdirSync(eventsDir, { recursive: true });
  }

  try {
    fs.watch(eventsDir, { persistent: false }, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const newEvents = readNewEvents();
        for (const evt of newEvents) {
          if (evt.event === 'session-start' && evt.agent === 'architect') {
            handleSessionStart(evt);
            return; // session-start resets everything
          }
          state.processEvent(evt);
        }
        if (newEvents.length > 0) {
          broadcastSSE('events', newEvents);
        }
      }, 100);
    });
  } catch {
    // fs.watch not available — fall back to polling
    setInterval(() => {
      const newEvents = readNewEvents();
      for (const evt of newEvents) {
        if (evt.event === 'session-start' && evt.agent === 'architect') {
          handleSessionStart(evt);
          return;
        }
        state.processEvent(evt);
      }
      if (newEvents.length > 0) {
        broadcastSSE('events', newEvents);
      }
    }, 1000);
  }

  function sendJSON(res, data, statusCode = 200) {
    const body = JSON.stringify(data);
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  }

  function serveStatic(res, reqPath) {
    const filePath = reqPath === '/' ? '/index.html' : reqPath;
    const fullPath = path.join(PUBLIC_DIR, filePath);
    const resolved = path.resolve(fullPath);

    // Path traversal protection
    if (!resolved.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(resolved, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(resolved);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': data.length,
      });
      res.end(data);
    });
  }

  function servePlan(res, filename) {
    // Validate filename — no path traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    const fullPath = path.join(PLANS_DIR, filename);
    const resolved = path.resolve(fullPath);

    if (!resolved.startsWith(path.resolve(PLANS_DIR))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(resolved, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(data),
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  }

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write('event: connected\ndata: {}\n\n');

      // Send current state snapshot
      const currentState = state.getState();
      res.write(`event: state\ndata: ${JSON.stringify(currentState)}\n\n`);

      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (pathname === '/api/state') {
      sendJSON(res, state.getState());
      return;
    }

    if (pathname.startsWith('/api/plan/')) {
      const filename = decodeURIComponent(pathname.slice('/api/plan/'.length));
      servePlan(res, filename);
      return;
    }

    // Static files
    serveStatic(res, pathname);
  });

  // Expose state and sseClients for testing
  server._state = state;
  server._sseClients = sseClients;

  return server;
}

module.exports = { createServer };
