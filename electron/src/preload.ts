require('./rt/electron-rt');
//////////////////////////////
// User Defined Preload scripts below
console.log('User Preload!');

// Expose IPC to renderer process
import { ipcRenderer } from 'electron';
(window as any).electronAPI = {
  sendLogout: () => ipcRenderer.send('user-logout'),
};
