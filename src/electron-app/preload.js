const { contextBridge, ipcRenderer } = require('electron');

/**
 * The renderer's entire privileged surface.
 *
 * Before this existed the renderer ran with `nodeIntegration: true` and
 * `contextIsolation: false`, so page scripts could reach Node directly through
 * `window.require('electron')`. That was survivable while the window only ever
 * loaded `http://127.0.0.1:<port>`. It stops being survivable the moment the
 * window points at a server on another machine over plain HTTP: anyone able to
 * sit between the two gets Node execution on the client.
 *
 * So the bridge exposes two calls and nothing else — no `ipcRenderer`, no
 * module loader, no `process`. Both are already used by
 * `src/app/store/index.js`; anything new belongs here as an explicit method
 * rather than as a widened escape hatch.
 */
contextBridge.exposeInMainWorld('cncjs', {
  readUserConfig: () => ipcRenderer.invoke('read-user-config'),
  writeUserConfig: (content) => ipcRenderer.invoke('write-user-config', content),
});
