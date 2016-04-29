/* eslint import/no-unresolved: 0 */
import { app, BrowserWindow, Menu, shell } from 'electron';
import cnc from './cnc';

// https://github.com/electron/electron/blob/master/docs/api/menu/
const template = [
    {
        label: 'View',
        submenu: [
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click: (item, focusedWindow) => {
                    if (focusedWindow) {
                        focusedWindow.reload();
                    }
                }
            },
            {
                label: 'Toggle Full Screen',
                accelerator: (process.platform === 'darwin') ? 'Ctrl+Command+F' : 'F11',
                click: (item, focusedWindow) => {
                    if (focusedWindow) {
                        focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                    }
                }
            },
            {
                label: 'Toggle Developer Tools',
                accelerator: (process.platform === 'darwin') ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click: (item, focusedWindow) => {
                    if (focusedWindow) {
                        focusedWindow.toggleDevTools();
                    }
                }
            }
        ]
    },
    {
        label: 'Window',
        role: 'window',
        submenu: [
            {
                label: 'Minimize',
                accelerator: 'CmdOrCtrl+M',
                role: 'minimize'
            },
            {
                label: 'Close',
                accelerator: 'CmdOrCtrl+W',
                role: 'close'
            }
        ]
    },
    {
        label: 'Help',
        role: 'help',
        submenu: [
            {
                label: 'Learn More',
                click: () => {
                    shell.openExternal('https://github.com/cheton/cnc');
                }
            }
        ]
    }
];

if (process.platform === 'darwin') {
    const name = app.getName();

    template.unshift({
        label: name,
        submenu: [
            {
                label: 'About ' + name,
                role: 'about'
            },
            {
                type: 'separator'
            },
            {
                label: 'Services',
                role: 'services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                label: 'Hide ' + name,
                accelerator: 'Command+H',
                role: 'hide'
            },
            {
                label: 'Hide Others',
                accelerator: 'Command+Alt+H',
                role: 'hideothers'
            },
            {
                label: 'Show All',
                role: 'unhide'
            },
            {
                type: 'separator'
            },
            {
                label: 'Quit',
                accelerator: 'Command+Q',
                click: () => {
                    forceQuit = true;
                    app.quit();
                }
            }
        ]
    });

    // Window menu
    template[2].submenu.push(
        {
            type: 'separator'
        },
        {
            label: 'Bring All to Front',
            role: 'front'
        }
    );
}

let forceQuit = false;

// prevent window being garbage collected
let mainWindow;

const createMainWindow = ({ address, port }) => {
    const win = new BrowserWindow({
        width: 1280,
        height: 768
    });
    const webContents = win.webContents;

    win.loadURL('http://' + address + ':' + port);

    win.on('close', (e) => {
        if (!forceQuit) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    // Open every external link in a new window
    // https://github.com/electron/electron/blob/master/docs/api/web-contents.md
    webContents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
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

    cnc({ host: '127.0.0.1', port: 0 }, (server) => {
        const address = server.address();
        if (!address) {
            console.error('Unable to start the server:', address);
            return;
        }

        mainWindow = createMainWindow({ address: address.address, port: address.port });
    });
});
