const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,
  onNavigateTab: (cb) => ipcRenderer.on('nav-tab', (_event, tab) => cb(tab)),
  onTriggerPrint: (cb) => ipcRenderer.on('trigger-print', cb),
  onTriggerSync: (cb) => ipcRenderer.on('trigger-sync', cb),
  onShowShortcuts: (cb) => ipcRenderer.on('show-shortcuts', cb)
});
