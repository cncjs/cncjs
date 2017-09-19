import { shell } from 'electron';
import trimStart from 'lodash/trimStart';

// https://github.com/electron/electron/blob/master/docs/api/menu/
export default (options) => {
    // routes = [
    //   {
    //     path: '/widget',
    //     directory: '~+/widget'
    //   }
    // ]
    const { address, port, routes = [] } = { ...options };
    const menuItems = routes.map(route => ({
        label: `${route.path}: ${route.directory}`,
        click: () => {
            const path = trimStart(route.path, '/');
            const url = `http://${address}:${port}/${path}`;
            shell.openExternal(url);
        }
    }));

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
                    type: 'separator'
                },
                {
                    label: 'Toggle Full Screen',
                    accelerator: 'F11',
                    click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                        }
                    }
                },
                {
                    label: 'Zoom',
                    submenu: [
                        {
                            label: 'Zoom In',
                            role: 'zoomin'
                        },
                        {
                            label: 'Zoom Out',
                            role: 'zoomout'
                        },
                        {
                            label: 'Reset',
                            role: 'resetzoom'
                        }
                    ]
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'Ctrl+Shift+I',
                    click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            focusedWindow.toggleDevTools();
                        }
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Home',
                    click: () => {
                        const url = `http://${address}:${port}`;
                        shell.openExternal(url);
                    }
                },
                ...menuItems
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
                    label: 'Help',
                    click: () => {
                        shell.openExternal('https://github.com/cncjs/cncjs/wiki');
                    }
                }
            ]
        }
    ];

    return template;
};
