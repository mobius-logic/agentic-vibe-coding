// dashboard/test/server.test.js
// Integration tests for the dashboard HTTP server

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createServer } = require('../server');

let server;
let baseUrl;

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          json() { return JSON.parse(body); },
        });
      });
    }).on('error', reject);
  });
}

describe('dashboard server', () => {
  before((_, done) => {
    server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  it('serves index.html at /', async () => {
    const res = await get('/');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.body.includes('Agent Monitor Dashboard'));
  });

  it('serves static CSS file', async () => {
    const res = await get('/styles.css');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/css'));
  });

  it('serves static JS file', async () => {
    const res = await get('/app.js');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('javascript'));
  });

  it('returns 404 for missing static file', async () => {
    const res = await get('/nonexistent.html');
    assert.equal(res.status, 404);
  });

  it('GET /api/summary returns summary data', async () => {
    const res = await get('/api/summary');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok('agents' in data);
    assert.ok('branches' in data);
    assert.ok('tasks' in data);
    assert.ok('recentEventsCount' in data);
  });

  it('GET /api/agents returns array', async () => {
    const res = await get('/api/agents');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data));
  });

  it('GET /api/branches returns branch data', async () => {
    const res = await get('/api/branches');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok('branches' in data);
    assert.ok('current' in data);
  });

  it('GET /api/plans returns array', async () => {
    const res = await get('/api/plans');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data));
  });

  it('GET /api/events returns array', async () => {
    const res = await get('/api/events');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data));
  });

  it('GET /api/events supports limit parameter', async () => {
    const res = await get('/api/events?limit=5');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data));
  });

  it('GET /api/logs returns array', async () => {
    const res = await get('/api/logs');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data));
  });

  it('GET /api/logs/:agent returns 404 for unknown agent', async () => {
    const res = await get('/api/logs/nonexistent-agent');
    assert.equal(res.status, 404);
  });

  it('returns 404 for unknown API endpoint', async () => {
    const res = await get('/api/unknown');
    assert.equal(res.status, 404);
  });

  it('prevents path traversal in static files', async () => {
    const res = await get('/../package.json');
    assert.ok(res.status === 403 || res.status === 404);
  });

  it('sets CORS headers', async () => {
    const res = await get('/api/summary');
    assert.equal(res.headers['access-control-allow-origin'], '*');
  });
});
