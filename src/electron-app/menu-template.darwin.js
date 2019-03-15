import { app, shell } from 'electron';
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
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services', submenu: [] },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'pasteandmatchstyle' },
                { role: 'delete' },
                { role: 'selectall' },
                { type: 'separator' },
                {
                    label: 'Speech',
                    submenu: [
                        { role: 'startspeaking' },
                        { role: 'stopspeaking' }
                    ]
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                { type: 'separator' },
                {
                    label: 'View In Browser',
                    click: () => {
                        const url = `http://${address}:${port}`;
                        shell.openExternal(url);
                    }
                },
                ...menuItems
            ]
        },
        {
            role: 'window',
            submenu: [
                { role: 'close' },
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Learn More',
                    click: () => {
                        shell.openExternal('https://github.com/cncjs/cncjs/wiki');
                    }
                }
            ]
        }
    ];

    return template;
};
