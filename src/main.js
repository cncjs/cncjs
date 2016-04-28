/* eslint import/no-unresolved: 0 */
import { app, BrowserWindow, Menu } from 'electron';
import open from 'open';
import cnc from './cnc';

const template = [
    {
        label: 'cnc',
        submenu: [
            {
                label: 'About cnc',
                selector: 'orderFrontStandardAboutPanel:'
            },
            {
                type: 'separator'
            },
            {
                label: 'Services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                label: 'Hide cnc',
                accelerator: 'CmdOrCtrl+H',
                selector: 'hide:'
            },
            {
                label: 'Hide Others',
                accelerator: 'CmdOrCtrl+Shift+H',
                selector: 'hideOtherApplications:'
            },
            {
                label: 'Show All',
                selector: 'unhideAllApplications:'
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit cnc',
                accelerator: 'CmdOrCtrl+Q',
                click: function() {
                    forceQuit = true;
                    app.quit();
                }
            }
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click: function() {
                    BrowserWindow.getFocusedWindow().reloadIgnoringCache();
                }
            },
            {
                label: 'Toggle DevTools',
                accelerator: 'Alt+CmdOrCtrl+I',
                click: function() {
                    BrowserWindow.getFocusedWindow().toggleDevTools();
                }
            }
        ]
    },
    {
        label: 'Window',
        submenu: [
            {
                label: 'Minimize',
                accelerator: 'CmdOrCtrl+M',
                selector: 'performMiniaturize:'
            },
            {
                label: 'Close',
                accelerator: 'CmdOrCtrl+W',
                selector: 'performClose:'
            },
            {
                type: 'separator'
            },
            {
                label: 'Bring All to Front',
                selector: 'arrangeInFront:'
            }
        ]
    },
    {
        label: 'Help',
        submenu: []
    }
];

let forceQuit = false;

// prevent window being garbage collected
let mainWindow;

const createMainWindow = ({ address, port }) => {
    const win = new BrowserWindow({
        width: 1280,
        height: 768
    });

    win.loadURL('http://' + address + ':' + port);

    win.on('close', (e) => {
        if (!forceQuit) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    // Open every external link in a new window
    // https://github.com/electron/electron/blob/master/docs/api/web-contents.md#event-new-window
    win.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        open(url);
    });

    return win;
};

app.on('activate', () => {
    if (!mainWindow) {
        mainWindow = createMainWindow();
    }
    mainWindow.show();
});

app.on('before-quit', () => {
    // handle menu-item or keyboard shortcut quit
    forceQuit = true;
});

app.on('will-quit', () => {
    // dereference the window
    mainWindow = null;
});

app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('ready', () => {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    cnc((server) => {
        const address = server.address();
        if (!address) {
            console.error('Unable to start the server:', address);
            return;
        }

        mainWindow = createMainWindow({ address: address.address, port: address.port });
    });
});
