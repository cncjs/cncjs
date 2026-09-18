const { contextBridge, ipcRenderer } = require('electron');

// The picker is a local page, but it gets the same treatment as the main
// window: a named surface rather than a door into Node.
contextBridge.exposeInMainWorld('serverPicker', {
  current: () => ipcRenderer.invoke('server-picker:current'),
  submit: (value) => ipcRenderer.invoke('server-picker:submit', value),
  cancel: () => ipcRenderer.invoke('server-picker:cancel'),
});
