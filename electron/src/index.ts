import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig } from '@capacitor-community/electron';
import { app, ipcMain } from 'electron';
import { spawn, execFile, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import * as http from 'http';
import { randomBytes } from 'crypto';
import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

let serverProcess: ChildProcess | null = null;
let nextProcess: ChildProcess | null = null;
let nextBackendReady = false;
let backendPort = 0;
const backendToken = randomBytes(32).toString('hex');
let quitting = false;
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig);

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}
function healthy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(`http://127.0.0.1:${port}/api/health`, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try { resolve(response.statusCode === 200 && JSON.parse(body).ok === true); }
        catch { resolve(false); }
      });
    });
    request.setTimeout(1000, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}
async function startServers() {
  backendPort = await getAvailablePort();
  const backend = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.resolve(app.getAppPath(), '..', '.next-server', 'standalone');
  const entry = path.join(backend, 'server.js');
  if (!fs.existsSync(entry)) throw new Error('Backend missing. Run npm run build:server before starting Electron.');
  const writable = path.join(app.getPath('userData'), 'backend');
  fs.mkdirSync(writable, { recursive: true });
  nextProcess = spawn(process.execPath, [entry], {
    cwd: writable,
    windowsHide: true,
    env: {
      ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production',
      HOSTNAME: '127.0.0.1', PORT: String(backendPort), AGENDA_API_TOKEN: backendToken,
      AGENDA_PORTAL_PROFILE_DIR: path.join(app.getPath('userData'), 'portal-browser-profile'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nextProcess.stdout?.on('data', (data) => console.log(`[Backend] ${data}`));
  nextProcess.stderr?.on('data', (data) => console.error(`[Backend] ${data}`));
  let failure: Error | null = null;
  nextProcess.on('error', (error) => { failure = error; });
  nextProcess.on('exit', () => { nextBackendReady = false; });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !quitting) {
    if (failure) throw failure;
    if (nextProcess.exitCode !== null) throw new Error('Backend exited before becoming ready.');
    if (await healthy(backendPort)) { nextBackendReady = true; return; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Backend health check timed out.');
}
const stopServers = () => {
  for (const child of [serverProcess, nextProcess]) {
    if (!child || child.exitCode !== null || !child.pid) continue;
    if (process.platform === 'win32') {
      execFile('taskkill', ['/F', '/T', '/PID', String(child.pid)], () => {});
    } else { child.kill(); }
  }
  nextBackendReady = false;
  serverProcess = null;
  nextProcess = null;
};
// Define our menu templates in setup.ts.

// The backend belongs to the application lifetime, not a planner profile.
ipcMain.handle('agenda:get-backend-status', async () => ({
  ready: nextBackendReady && await healthy(backendPort), port: backendPort, token: backendToken,
  urls: nextBackendReady ? [`http://127.0.0.1:${backendPort}`] : [],
}));

app.whenReady().then(async () => {
  try {
    await startServers();
    setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme(), backendPort);
    if (!app.isPackaged) setupReloadWatcher(myCapacitorApp);
    await myCapacitorApp.init();
    if (process.env.AGENDA_SMOKE_TEST === '1') {
      const window = myCapacitorApp.getMainWindow();
      if (window.webContents.isLoading()) {
        await new Promise<void>((resolve, reject) => {
          window.webContents.once('did-finish-load', () => resolve());
          window.webContents.once('did-fail-load', (_event, code, description) => reject(new Error(`${code}: ${description}`)));
        });
      }
      const loaded = await window.webContents.executeJavaScript(`(async () => {
        const status = await window.electronAPI.getBackendStatus();
        const health = await fetch(status.urls[0] + '/api/health');
        const denied = await fetch(status.urls[0] + '/api/parse-assignment');
        const authorized = await fetch(status.urls[0] + '/api/parse-assignment', { headers: { 'X-Agenda-Token': status.token } });
        return document.title.includes('Agenda+') && status.ready && document.body.innerText.length > 0
          && (await health.json()).ok && denied.status === 401 && authorized.status === 405;
      })()`);
      if (!loaded) throw new Error('Packaged frontend or preload/backend bridge failed.');
      console.log('AGENDA_SMOKE_OK');
      app.quit();
    }
  } catch (error) {
    console.error('Agenda+ startup failed:', error);
    if (process.env.AGENDA_SMOKE_TEST === '1') { stopServers(); app.exit(1); }
    else {
      // Core planner remains usable when optional backend features are unavailable.
      setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme(), backendPort);
      await myCapacitorApp.init();
    }
  }
});
app.on('before-quit', () => { quitting = true; stopServers(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', async () => {
  if (myCapacitorApp.getMainWindow()?.isDestroyed()) await myCapacitorApp.init();
});
