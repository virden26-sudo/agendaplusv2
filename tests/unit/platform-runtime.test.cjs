const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { serverOptions } = require('../../scripts/start-server.cjs');

function loadTs(file, dependencies, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: id => id in dependencies ? dependencies[id] : require(id),
    process: { platform: process.platform, env: {} }, console, ...globals,
  });
  return exports;
}
const browser = loadTs('src/lib/browser-runtime.ts', {});
for (const [platform, file] of [
  ['win32', 'C:\\Users\\Student\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe'],
  ['darwin', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  ['linux', '/usr/bin/chromium'],
]) {
  test(`portal browser resolves installed executable on ${platform}`, () => {
    assert.equal(browser.findBrowserExecutable({ platform, env: { LOCALAPPDATA: 'C:\\Users\\Student\\AppData\\Local' }, home: '/home/student', exists: candidate => candidate === file }), file);
  });
}
test('browser override is validated and missing browsers give an actionable error', () => {
  assert.equal(browser.findBrowserExecutable({ env: { AGENDA_BROWSER_EXECUTABLE: '/custom/chrome' }, exists: file => file === '/custom/chrome' }), '/custom/chrome');
  assert.throws(() => browser.findBrowserExecutable({ env: { AGENDA_BROWSER_EXECUTABLE: '/missing' }, exists: () => false }), /does not exist/);
  assert.throws(() => browser.findBrowserExecutable({ env: {}, exists: () => false }), /Install Chrome/);
});

test('standalone service defaults to loopback and requires a token for other devices', () => {
  assert.deepEqual(serverOptions({}), { host: '127.0.0.1', port: 3000 });
  assert.throws(() => serverOptions({ AGENDA_HOST: '0.0.0.0' }), /AGENDA_API_TOKEN/);
  assert.deepEqual(serverOptions({ AGENDA_HOST: '0.0.0.0', AGENDA_PORT: '3010', AGENDA_API_TOKEN: 'test-token' }), { host: '0.0.0.0', port: 3010 });
  assert.throws(() => serverOptions({ AGENDA_PORT: 'bad' }), /between 1 and 65535/);
});

function loadApi({ remote = '', platform = 'android', electron = false, urls = [], fetcher } = {}) {
  const local = new Map(remote ? [['agendaRemoteApiBaseUrl', remote]] : []);
  const session = new Map([['agendaRemoteApiToken', 'session-test-token']]);
  return loadTs('src/lib/api-config.ts', {
    '@capacitor/core': { Capacitor: { getPlatform: () => platform } },
    '@/lib/electron-bridge': {
      isElectronShell: () => electron,
      getElectronBackendCandidates: async () => urls,
      getElectronBackendHeaders: async () => ({}),
    },
  }, {
    window: { location: { protocol: 'https:', hostname: 'localhost', port: '' }, setTimeout, clearTimeout },
    localStorage: { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value), removeItem: key => local.delete(key) },
    sessionStorage: { getItem: key => session.get(key) ?? null },
    Headers, Response, AbortSignal, AbortController, setTimeout, fetch: fetcher,
  });
}
test('Android uses its saved service for both readiness and authenticated requests', async () => {
  const calls = [];
  const api = loadApi({ remote: 'https://service.example', fetcher: async (url, init) => {
    calls.push({ url, token: init.headers?.get('X-Agenda-Token') });
    return Response.json({ ok: true });
  } });
  assert.equal(await api.resolveApiBaseUrl(), 'https://service.example');
  await api.apiFetch('/api/connection');
  assert.equal(calls[0].url, 'https://service.example/api/health');
  assert.equal(calls[1].url, 'https://service.example/api/connection');
  assert.equal(calls[1].token, 'session-test-token');
});
test('an explicit service authentication failure is preserved rather than returned as an empty successful scan', async () => {
  const api = loadApi({ remote: 'https://service.example', fetcher: async () => Response.json({error:'Unauthorized'}, {status:401}) });
  assert.equal((await api.apiFetch('/api/parse-portal')).status, 401);
});
test('offline mobile fails immediately without scanning localhost or inventing successful extraction', async () => {
  let requests = 0;
  const api = loadApi({ fetcher: async () => { requests++; throw new Error('No network'); } });
  assert.equal(await api.waitForApiBackend(), null);
  await assert.rejects(api.apiFetch('/api/parse-portal'), /connected service/);
  assert.equal(requests, 0);
});
test('desktop uses its actual sidecar port and deployed web uses the same origin', async () => {
  const desktop = loadApi({ platform: 'web', electron: true, urls: ['http://127.0.0.1:45678'] });
  assert.deepEqual(Array.from(await desktop.collectApiBaseCandidates()), ['http://127.0.0.1:45678']);
  const web = loadApi({ platform: 'web' });
  assert.deepEqual(Array.from(web.getStaticApiBaseCandidates()), ['']);
});
