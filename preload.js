const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  startAudioMonitoring: () => ipcRenderer.invoke('start-audio-monitoring'),
  stopAudioMonitoring: () => ipcRenderer.invoke('stop-audio-monitoring'),
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  platform: process.platform
});