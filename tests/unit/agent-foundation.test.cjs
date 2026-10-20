const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { z } = require('zod');

function loadTs(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: (id) => {
      assert.ok(id in dependencies, `Unexpected dependency: ${id}`);
      return dependencies[id];
    }, console: { log() {}, warn() {} }, Date,
  });
  return exports;
}

for (const [name, payload, valid] of [
  ['offline response', { offline: true, assignments: [] }, false],
  ['malformed response', { task: 42 }, false],
  ['blank task', { task: '  ' }, false],
  ['valid assignment', { task: 'Read chapter 3' }, true],
]) {
  test(`assignment parser handles ${name}`, async () => {
    let fallbacks = 0;
    const api = loadTs('src/lib/local-api.ts', {
      '@/lib/client-ai-fallbacks': {
        parseAssignmentHeuristically: () => { fallbacks++; return { task: 'Local fallback' }; },
      },
      '@/lib/portal-sync-client': {},
      '@/ai/schemas/assignment': { AssignmentSchema: z.object({ task: z.string() }) },
      '@/lib/api-config': { apiFetch: async () => ({ ok: true, json: async () => payload }) },
    });
    const result = await api.parseAssignmentText('Read chapter 3');
    assert.equal(fallbacks, valid ? 0 : 1);
    assert.equal(result.task, valid ? payload.task : 'Local fallback');
  });
}

test('preload exposes only the intended IPC methods through contextBridge', async () => {
  let bridge;
  const calls = [];
  loadTs('electron/src/preload.ts', {
    './rt/electron-rt.js': {},
    electron: {
      contextBridge: { exposeInMainWorld: (name, api) => { bridge = { name, api }; } },
      ipcRenderer: {
        send: (...args) => calls.push(args),
        invoke: async (...args) => { calls.push(args); return { ready: true }; },
      },
    },
  });
  assert.equal(bridge.name, 'electronAPI');
  assert.deepEqual(Object.keys(bridge.api).sort(), ['getBackendStatus', 'sendLogout']);
  bridge.api.sendLogout();
  assert.equal((await bridge.api.getBackendStatus()).ready, true);
  assert.deepEqual(calls, [['user-logout'], ['agenda:get-backend-status']]);
});

test('Windows shutdown kills only owned running process IDs and resets status', () => {
  const source = fs.readFileSync('electron/src/index.ts', 'utf8');
  const start = source.indexOf('const stopServers =');
  const end = source.indexOf('// Define our menu templates', start);
  const calls = [];
  const context = {
    serverProcess: null, // Pre-existing Ollama was reused, not started by Agenda+.
    nextProcess: { pid: 123, exitCode: null }, nextBackendReady: true,
    process: { platform: 'win32' }, console: { log() {} },
    execFile: (file, args) => calls.push({ file, args: Array.from(args) }),
  };
  const code = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code + '\nstopServers(); stopServers();', context);
  assert.deepEqual(calls, [{ file: 'taskkill', args: ['/F', '/T', '/PID', '123'] }]);
  assert.equal(context.nextBackendReady, false);
});
