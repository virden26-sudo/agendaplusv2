import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import type { MenuItemConstructorOptions } from 'electron';
import { app, MenuItem, ipcMain } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';

import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

// Graceful handling of unhandled errors.
unhandled();

// Track server processes
let serverProcess: any = null;
let nextProcess: any = null;
let nextBackendReady = false;
let agendaProjectRoot: string | null = null;

const NEXT_PORT = 3000;

const isPortOpen = (host: string, port: number, timeoutMs = 1500): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (isOpen: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
  });
};

const getLanUrls = (port: number) => {
  const urls = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];

  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) {
        urls.push(`http://${address.address}:${port}`);
      }
    }
  }

  return Array.from(new Set(urls));
};

const prefixProcessOutput = (
  stream: NodeJS.ReadableStream,
  prefix: string,
  transformLine: (line: string) => string | null = (line) => line
) => {
  stream.on('data', (data: Buffer) => {
    for (const line of data.toString().split(/\r?\n/)) {
      const trimmed = line.trimEnd();
      if (!trimmed) {
        continue;
      }

      const outputLine = transformLine(trimmed);
      if (outputLine) {
        console.log(`${prefix} ${outputLine}`);
      }
    }
  });
};

const extendPathForNode = () => {
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
  const extras = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs'),
    path.join(process.env.APPDATA || '', 'npm'),
  ];

  process.env[pathKey] = [...extras, process.env[pathKey] || ''].filter(Boolean).join(path.delimiter);
};

const waitForPort = async (host: string, port: number, maxWaitMs: number) => {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (await isPortOpen(host, port)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
};

const readConfiguredProjectRoot = () => {
  if (process.env.AGENDA_PLUS_ROOT) {
    return process.env.AGENDA_PLUS_ROOT;
  }

  const configPaths = [
    path.join(process.env.APPDATA || '', 'Agenda+', 'project-root.txt'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Agenda+', 'project-root.txt'),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const configured = fs.readFileSync(configPath, 'utf8').trim();
        if (configured) {
          return configured;
        }
      }
    } catch {
      // ignore invalid config reads
    }
  }

  return null;
};

const rememberProjectRoot = (rootPath: string) => {
  try {
    const configDir = path.join(process.env.APPDATA || '', 'Agenda+');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'project-root.txt'), rootPath, 'utf8');
  } catch (error) {
    console.warn('GenesisAi: Could not persist project root path.', error);
  }
};

const findProjectRoot = () => {
  const candidates = [
    readConfiguredProjectRoot(),
    process.env.AGENDA_PLUS_ROOT,
    'C:\\AgendaPlusv2.0',
    path.join(process.env.USERPROFILE || '', 'AgendaPlusv2.0'),
    path.join(process.env.USERPROFILE || '', 'Documents', 'AgendaPlusv2.0'),
    path.join(process.env.USERPROFILE || '', 'source', 'repos', 'AgendaPlusv2.0'),
    process.cwd(),
  ].filter(Boolean) as string[];

  try {
    const exeDir = path.dirname(app.getPath('exe'));
    candidates.push(path.dirname(exeDir), exeDir);
  } catch {
    // app.getPath may be unavailable very early
  }

  candidates.push(path.join(app.getAppPath(), '..'), path.join(app.getAppPath(), '..', '..'));

  for (const candidate of candidates) {
    const packageJsonPath = path.join(candidate, 'package.json');
    const apiPath = path.join(candidate, 'src', 'app', 'api');

    if (fs.existsSync(packageJsonPath) && fs.existsSync(apiPath)) {
      return candidate;
    }
  }

  return null;
};

const pickNextScript = (rootPath: string) => {
  const buildIdPath = path.join(rootPath, '.next', 'BUILD_ID');
  const configPath = path.join(rootPath, 'next.config.mjs');
  
  let isExport = false;
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      if (configContent.includes("output: 'export'") || configContent.includes('output: "export"')) {
        isExport = true;
      }
    }
  } catch (err) {
    console.error('GenesisAi: Error checking next.config.mjs', err);
  }

  // next start (RunIt) fails with output: export.
  // fallback to dev:next if export is enabled.
  return (fs.existsSync(buildIdPath) && !isExport) ? 'RunIt' : 'dev:next';
};

// Function to start the servers (ollama and next.js)
const startServers = async () => {
  console.log('GenesisAi: Starting sidecar services...');
  extendPathForNode();

  const rootPath = findProjectRoot();
  agendaProjectRoot = rootPath;

  if (rootPath) {
    rememberProjectRoot(rootPath);
  }
  
  // Start Ollama
  try {
    if (await isPortOpen('127.0.0.1', 11434)) {
      console.log('GenesisAi: Ollama is already running at http://127.0.0.1:11434.');
    } else {
      const ollamaEnv = { ...process.env, OLLAMA_VULKAN: '1' };
      serverProcess = spawn('ollama', ['serve'], { env: ollamaEnv, shell: true });

      prefixProcessOutput(serverProcess.stdout, '[Ollama]');
      prefixProcessOutput(serverProcess.stderr, '[Ollama]');
      serverProcess.on('exit', (code: any) => {
        console.log(`GenesisAi: Ollama process exited with code ${code}`);
      });
      serverProcess.on('error', (err: any) => {
        console.error('GenesisAi: Ollama process error:', err);
      });
    }
  } catch (err) {
    console.error('Failed to start Ollama:', err);
  }

  // Start Next.js (Sidecar for API routes)
  try {
    if (!rootPath) {
      console.error(
        'GenesisAi: Could not find Agenda+ project root. Clone/build the repo, run "npm run dev" from that folder, or create %APPDATA%\\Agenda+\\project-root.txt with the full path to AgendaPlusv2.0.'
      );
      nextBackendReady = false;
      return;
    }

    if (await isPortOpen('127.0.0.1', NEXT_PORT)) {
      console.log(`GenesisAi: Next.js API already listening on http://127.0.0.1:${NEXT_PORT}`);
      nextBackendReady = true;
      return;
    }

    const nextScript = pickNextScript(rootPath);
    console.log(`GenesisAi: Spawning Next.js (${nextScript}) from ${rootPath}`);
    console.log(`GenesisAi: Usable API URLs: ${getLanUrls(NEXT_PORT).join(', ')}`);
    nextProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', nextScript], {
      cwd: rootPath,
      shell: true,
      env: process.env,
    });

    const formatNextLine = (line: string) => {
      if (line.includes('Network:') && line.includes('0.0.0.0:9002')) {
        return `Network URLs: ${getLanUrls(NEXT_PORT).join(', ')}`;
      }

      return line;
    };

    prefixProcessOutput(nextProcess.stdout, '[Next.js]', formatNextLine);
    prefixProcessOutput(nextProcess.stderr, '[Next.js]', formatNextLine);
    nextProcess.on('exit', (code: any) => {
      console.log(`GenesisAi: Next.js process exited with code ${code}`);
      nextBackendReady = false;
    });
    nextProcess.on('error', (err: any) => {
      console.error('GenesisAi: Next.js process error:', err);
      nextBackendReady = false;
    });

    nextBackendReady = await waitForPort('127.0.0.1', NEXT_PORT, 120_000);
    if (nextBackendReady) {
      console.log(`GenesisAi: Next.js API is ready at http://127.0.0.1:${NEXT_PORT}`);
    } else {
      console.error(
        `GenesisAi: Timed out waiting for Next.js on port ${NEXT_PORT}. Run "npm run dev:next" manually from ${rootPath}.`
      );
    }
  } catch (err) {
    console.error('Failed to start Next.js:', err);
    nextBackendReady = false;
  }
};

// Function to stop the servers
const stopServers = () => {
  console.log('GenesisAi: Stopping sidecar services...');
  
  if (process.platform === 'win32') {
    // Force kill Ollama
    exec('taskkill /F /IM ollama.exe /T', (error) => {
      if (error) console.log('Ollama process not found or already stopped');
    });
    
    // Force kill Next.js process tree
    if (nextProcess && nextProcess.pid) {
      exec(`taskkill /F /T /PID ${nextProcess.pid}`, (error) => {
        if (error) console.log('Next.js process tree not found or already stopped');
      });
    }
  } else {
    if (serverProcess) serverProcess.kill();
    if (nextProcess) nextProcess.kill();
  }
  
  serverProcess = null;
  nextProcess = null;
  console.log('GenesisAi: Sidecar services stopped');
};

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
  { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
  { role: 'viewMenu' },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();
console.log('GenesisAi: Capacitor Configuration:', JSON.stringify(capacitorFileConfig, null, 2));

// Initialize our app. You can pass menu templates into the app here.
// const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig);
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

// If deeplinking is enabled then we will set it up here.
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
  });
}

// If we are in Dev mode, use the file watcher components.
if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

// Run Application
(async () => {
  try {
    // Wait for electron app to be ready.
    await app.whenReady();

    // Start sidecar servers (portal sync needs Next.js API on port 9002)
    await startServers();

    // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
    setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
    // Initialize our app, build windows, and load content.
    await myCapacitorApp.init();
  } catch (error) {
    console.error('GenesisAi: Critical error during app initialization:', error);
    app.quit();
  }
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', function () {
  console.log('GenesisAi: window-all-closed event triggered');
  // Stop servers before quitting
  stopServers();
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    console.log('GenesisAi: Quitting app because window-all-closed');
    app.quit();
  }
});

// Handle app quit
app.on('quit', () => {
  console.log('GenesisAi: app quit event triggered');
  stopServers();
});

// When the dock icon is clicked.
app.on('activate', async function () {
  console.log('GenesisAi: app activate event triggered');
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    console.log('GenesisAi: Re-initializing main window');
    await myCapacitorApp.init();
  }
});

// IPC handler for logout - stop servers when user logs out
ipcMain.on('user-logout', () => {
  console.log('GenesisAi: user-logout IPC received');
  stopServers();
});

ipcMain.handle('agenda:get-backend-status', async () => {
  const portOpen = await isPortOpen('127.0.0.1', NEXT_PORT);
  nextBackendReady = portOpen || nextBackendReady;

  return {
    ready: nextBackendReady && portOpen,
    projectRoot: agendaProjectRoot,
    port: NEXT_PORT,
    urls: getLanUrls(NEXT_PORT),
  };
});

// Place all ipc or other electron api calls and custom functionality under this line
