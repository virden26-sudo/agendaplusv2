import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import type { MenuItemConstructorOptions } from 'electron';
import { app, MenuItem, ipcMain } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { autoUpdater } from 'electron-updater';
import { spawn, exec } from 'child_process';
import * as path from 'path';

import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';

// Graceful handling of unhandled errors.
unhandled();

// Track server processes
let serverProcess: any = null;
let nextProcess: any = null;

// Function to start the servers (ollama and next.js)
const startServers = () => {
  console.log('GenesisAi: Starting sidecar services...');
  
  const rootPath = path.join(app.getAppPath(), '..');
  
  // Start Ollama
  try {
    const ollamaEnv = { ...process.env, OLLAMA_VULKAN: '1' };
    serverProcess = spawn('ollama', ['serve'], { env: ollamaEnv, shell: true });
    
    serverProcess.stdout.on('data', (data: any) => console.log(`[Ollama] ${data}`));
    serverProcess.stderr.on('data', (data: any) => console.error(`[Ollama Error] ${data}`));
  } catch (err) {
    console.error('Failed to start Ollama:', err);
  }

  // Start Next.js (Sidecar for API routes)
  try {
    console.log(`GenesisAi: Spawning Next.js dev server from ${rootPath}`);
    nextProcess = spawn('npx', ['next', 'dev', '-p', '9002', '--webpack'], { 
      cwd: rootPath, 
      shell: true 
    });
    
    nextProcess.stdout.on('data', (data: any) => console.log(`[Next.js] ${data}`));
    nextProcess.stderr.on('data', (data: any) => console.error(`[Next.js Error] ${data}`));
  } catch (err) {
    console.error('Failed to start Next.js:', err);
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
  // Wait for electron app to be ready.
  await app.whenReady();

  // Start sidecar servers
  startServers();

  // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
  setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
  // Initialize our app, build windows, and load content.
  await myCapacitorApp.init();
  // Check for updates if we are in a packaged app.
  autoUpdater.checkForUpdatesAndNotify();
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', function () {
  // Stop servers before quitting
  stopServers();
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('quit', () => {
  stopServers();
});

// When the dock icon is clicked.
app.on('activate', async function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});

// IPC handler for logout - stop servers when user logs out
ipcMain.on('user-logout', () => {
  stopServers();
});

// Place all ipc or other electron api calls and custom functionality under this line
