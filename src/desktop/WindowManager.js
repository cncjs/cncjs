/* eslint import/no-unresolved: 0 */
import { app, BrowserWindow, shell } from 'electron';
//import AutoUpdater from './AutoUpdater';

class WindowManager {
    windows = [];
    title = '';
    url = '';

    constructor() {
        // https://github.com/electron/electron/blob/master/docs/api/app.md#event-activate-os-x
        // Emitted when the application is activated, which usually happens
        // when the user clicks on the application's dock icon.
        app.on('activate', (e) => {
            const window = this.getWindow();
            if (!window) {
                this.openWindow({
                    title: this.title,
                    url: this.url
                });
            }
        });

        // https://github.com/electron/electron/blob/master/docs/api/app.md#event-window-all-closed
        // Emitted when all windows have been closed.
        // This event is only emitted when the application is not going to quit.
        // If the user pressed Cmd + Q, or the developer called app.quit(), Electron
        // will first try to close all the windows and then emit the will-quit event,
        // and in this case the window-all-closed event would not be emitted.
        app.on('window-all-closed', () => {
            // On OS X it is common for applications and their menu bar
            // to stay active until the user quits explicitly with Cmd + Q
            if (process.platform === 'darwin') {
                const window = this.getWindow();
                if (window) {
                    // Remember current window attributes that will be used for the next 'activate' event
                    this.title = window.webContents.getTitle();
                    this.url = window.webContents.getURL();
                }
                return;
            }

            app.quit();
        });
    }
    openWindow(url, options) {
        const window = new BrowserWindow({
            ...options,
            show: false
        });
        const webContents = window.webContents;

        window.on('closed', (event) => {
            const index = this.windows.indexOf(event.sender);
            console.assert(index >= 0);
            this.windows.splice(index, 1);
        });

        // Open every external link in a new window
        // https://github.com/electron/electron/blob/master/docs/api/web-contents.md
        webContents.on('new-window', (event, url) => {
            event.preventDefault();
            shell.openExternal(url);
        });

        webContents.once('dom-ready', () => {
            window.show();
        });

        // Call `ses.setProxy` to ignore proxy settings
        // http://electron.atom.io/docs/latest/api/session/#sessetproxyconfig-callback
        const ses = webContents.session;
        ses.setProxy({ proxyRules: 'direct://' }, () => {
            window.loadURL(url);
        });

        this.windows.push(window);

        // Disable AutoUpdater until an update server is available
        //new AutoUpdater(window);

        return window;
    }
    getWindow(index = 0) {
        if (this.windows.length === 0) {
            return null;
        }
        return this.windows[index] || null;
    }
}

export default WindowManager;
