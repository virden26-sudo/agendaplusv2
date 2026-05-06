require('./rt/electron-rt');
//////////////////////////////
// User Defined Preload scripts below
console.log('User Preload!');

// Expose IPC to renderer process
import {contextBridge, ipcRenderer} from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    sendLogout: () => ipcRenderer.send('user-logout'),
});
