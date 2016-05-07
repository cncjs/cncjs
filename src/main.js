/* eslint import/no-unresolved: 0 */
import path from 'path';
import { spawn } from 'child_process';
import { app, BrowserWindow, Menu, shell } from 'electron';
import cnc from './cnc';

const debug = require('debug')('cnc');

// Handle Squirrel Events
// https://github.com/electron/windows-installer#handling-squirrel-events
const handleSquirrelEvents = () => {
    if (process.platform !== 'win32') {
        return false;
    }

    const run = (args, done) => {
        const appPath = path.resolve(process.execPath, '..');
        const rootAtomPath = path.resolve(appPath, '..');
        const updateExe = path.resolve(path.join(rootAtomPath, 'Update.exe'));

        debug('Spawning `%s` with args `%s`', updateExe, args);
        spawn(updateExe, args, { detached: true })
            .on('close', done);
    };

    const cmd = process.argv[1];
    const exeName = path.basename(process.execPath);

    debug('Processing squirrel command `%s`', cmd);

    // Optionally do things such as:
    // - Install desktop and start menu shortcuts
    // - Add your .exe to the PATH
    // - Write to the registry for things like file associations and explorer context menus
    if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
        // Install desktop and start menu shortcuts
        run(['--createShortcut=' + exeName + ''], app.quit);
        return true;
    }

    // Undo anything you did in the --squirrel-install and --squirrel-updated handlers
    if (cmd === '--squirrel-uninstall') {
        // Remove desktop and start menu shortcuts
        run(['--removeShortcut=' + exeName + ''], app.quit);
        return true;
    }

    // This is called on the outgoing version of your app before updating to the new version -
    // it's the opposite of --squirrel-updated
    if (cmd === '--squirrel-obsolete') {
        app.quit();
        return true;
    }

    return false;
};

// prevent window being garbage collected
let mainWindow;
let forceQuit = false;

if (!handleSquirrelEvents()) {
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
                        shell.openExternal('https://github.com/cheton/cnc/wiki');
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

    const createMainWindow = ({ address, port }) => {
        const win = new BrowserWindow({
            width: 1280,
            height: 768,
            show: false
        });
        const webContents = win.webContents;

        // Open every external link in a new window
        // https://github.com/electron/electron/blob/master/docs/api/web-contents.md
        webContents.on('new-window', (event, url) => {
            event.preventDefault();
            shell.openExternal(url);
        });

        win.loadURL('http://' + address + ':' + port);
        win.show();

        return win;
    };

    // https://github.com/electron/electron/blob/master/docs/api/app.md#event-activate-os-x
    // Emitted when the application is activated, which usually happens
    // when the user clicks on the application's dock icon.
    app.on('activate', (e) => {
        if (!mainWindow) {
            mainWindow = createMainWindow();
        }
        mainWindow.show();
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
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    // https://github.com/electron/electron/blob/master/docs/api/app.md#event-before-quit
    // Emitted before the application starts closing its windows.
    // Calling event.preventDefault() will prevent the default behaviour, which
    // is terminating the application.
    app.on('before-quit', (e) => {
        if ((process.platform === 'darwin') && !forceQuit) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    // https://github.com/electron/electron/blob/master/docs/api/app.md#event-will-quit
    // Emitted when all windows have been closed and the application will quit.
    // Calling event.preventDefault() will prevent the default behaviour, which
    // is terminating the application.
    app.on('will-quit', (e) => {
        // dereference the window
        mainWindow = null;
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
}
