import type {CapacitorElectronConfig} from '@capacitor-community/electron';
import {getCapacitorElectronConfig, setupElectronDeepLinking} from '@capacitor-community/electron';
import type {MenuItemConstructorOptions} from 'electron';
import {app, ipcMain, MenuItem} from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import {autoUpdater} from 'electron-updater';
import {exec, spawn} from 'child_process';
import * as path from 'path';
import * as net from 'net';

import {ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher} from './setup';

// Graceful handling of unhandled errors.
unhandled();

// Track server processes
let nextProcess: any = null;

// Function to check if a port is in use
const checkPort = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port, '127.0.0.1');
    });
};

// Function to start the servers (next.js)
const startServers = async () => {
    console.log('GenesisAi: Checking sidecar services...');

    const rootPath = path.join(app.getAppPath(), '..');

    // Check and Start Next.js (Sidecar for API routes)
    const isNextRunning = await checkPort(9002);
    if (isNextRunning) {
        console.log('GenesisAi: Next.js dev server is already running on port 9002. Skipping startup.');
    } else {
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
    }
};

// Function to stop the servers
const stopServers = async () => {
    console.log('GenesisAi: Stopping sidecar services...');

    return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
            console.warn('GenesisAi: Server shutdown timeout - forcing termination');
            resolve();
        }, 5000); // 5 second timeout

        try {
            if (process.platform === 'win32') {
                // Force kill Next.js process tree if we started it
                if (nextProcess && nextProcess.pid) {
                    exec(`taskkill /F /T /PID ${nextProcess.pid}`, (error) => {
                        if (error) console.log('Next.js process tree not found or already stopped');
                        clearTimeout(timeout);
                        nextProcess = null;
                        console.log('GenesisAi: Sidecar services stopped');
                        resolve();
                    });
                } else {
                    clearTimeout(timeout);
                    nextProcess = null;
                    console.log('GenesisAi: Sidecar services stopped');
                    resolve();
                }
            } else {
                if (nextProcess) nextProcess.kill();

                // Give processes time to terminate gracefully
                setTimeout(() => {
                    clearTimeout(timeout);
                    nextProcess = null;
                    console.log('GenesisAi: Sidecar services stopped');
                    resolve();
                }, 500);
            }
        } catch (err) {
            clearTimeout(timeout);
            console.error('Error stopping servers:', err);
            nextProcess = null;
            resolve();
        }
    });
};

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({label: 'Quit App', role: 'quit'})];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
    {role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu'},
    {role: 'viewMenu'},
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
    await startServers();

    // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
    setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
    // Initialize our app, build windows, and load content.
    await myCapacitorApp.init();
    // Check for updates if we are in a packaged app.
    autoUpdater.checkForUpdatesAndNotify();
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', async function () {
    // Stop servers before quitting
    await stopServers();
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle app quit
app.on('quit', async () => {
    await stopServers();
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
ipcMain.on('user-logout', async () => {
    await stopServers();
});

// Place all ipc or other electron api calls and custom functionality under this line
