// dashboard/test/emit-event.test.js
// Tests for emit-event.js CLI argument parsing

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const EMIT_SCRIPT = path.resolve(__dirname, '..', 'lib', 'emit-event.js');

function runEmit(args, eventsFile) {
  const env = { ...process.env };
  // We'll pass the events file via a temp wrapper or check the output
  const cmd = `node ${EMIT_SCRIPT} ${args}`;
  try {
    const output = execSync(cmd, { encoding: 'utf8', env, timeout: 5000 });
    return { output: output.trim(), exitCode: 0 };
  } catch (err) {
    return { output: (err.stderr || err.stdout || '').trim(), exitCode: err.status };
  }
}

describe('emit-event.js CLI', () => {
  it('should fail with no arguments', () => {
    const result = runEmit('');
    assert.notEqual(result.exitCode, 0);
    assert.ok(result.output.includes('Usage'));
  });

  it('should fail with only one argument', () => {
    const result = runEmit('architect');
    assert.notEqual(result.exitCode, 0);
  });

  it('should log a basic event successfully', () => {
    const result = runEmit('test-agent test-event');
    assert.equal(result.exitCode, 0);
    assert.ok(result.output.includes('Event logged'));
    assert.ok(result.output.includes('test-agent'));
  });

  it('should parse --branch flag', () => {
    const result = runEmit('agent1 branch-created --branch feature/test');
    assert.equal(result.exitCode, 0);
    assert.ok(result.output.includes('Event logged'));
  });

  it('should parse --parent flag', () => {
    const result = runEmit('agent1 spawned --parent architect');
    assert.equal(result.exitCode, 0);
    assert.ok(result.output.includes('Event logged'));
  });

  it('should parse --todos flag with valid JSON', () => {
    const todos = JSON.stringify([{ id: 1, title: 'Test', status: 'in-progress' }]);
    const result = runEmit(`agent1 todo-update --todos '${todos}'`);
    assert.equal(result.exitCode, 0);
    assert.ok(result.output.includes('Event logged'));
  });

  it('should fail with invalid --todos JSON', () => {
    const result = runEmit('agent1 todo-update --todos not-json');
    assert.notEqual(result.exitCode, 0);
    assert.ok(result.output.includes('--todos must be valid JSON'));
  });

  it('should parse --taskIndex and --taskTotal as numbers', () => {
    const result = runEmit('agent1 task-started --task "Build" --taskIndex 2 --taskTotal 10');
    assert.equal(result.exitCode, 0);
  });

  it('should parse --plan flag', () => {
    const result = runEmit('arch session-start --plan ".plans/test.md"');
    assert.equal(result.exitCode, 0);
  });
});
