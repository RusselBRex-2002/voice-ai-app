import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  }
});
