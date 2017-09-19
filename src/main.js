/* eslint import/no-unresolved: 0 */
import { app, Menu } from 'electron';
import chalk from 'chalk';
import mkdirp from 'mkdirp';
import menuTemplate from './desktop/menu-template';
import WindowManager from './desktop/WindowManager';
import cnc from './cnc';
import pkg from './package.json';

let windowManager = null;

const main = () => {
    // https://github.com/electron/electron/blob/master/docs/api/app.md#appmakesingleinstancecallback
    const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (!windowManager) {
            return;
        }

        const window = windowManager.getWindow();
        if (window) {
            if (window.isMinimized()) {
                window.restore();
            }
            window.focus();
        }
    });

    if (shouldQuit) {
        app.quit();
        return;
    }

    // Create the user data directory if it does not exist
    const userData = app.getPath('userData');
    mkdirp.sync(userData);

    app.on('ready', () => {
        cnc({ host: '127.0.0.1', port: 0 }, (err, data) => {
            if (err) {
                console.error('Error:', err);
                return;
            }

            const { address, port, routes } = { ...data };
            if (!(address && port)) {
                console.error('Unable to start the server at ' + chalk.cyan(`http://${address}:${port}`));
                return;
            }

            const menu = Menu.buildFromTemplate(menuTemplate({ address, port, routes }));
            Menu.setApplicationMenu(menu);

            windowManager = new WindowManager();
            windowManager.openWindow({
                title: `${pkg.name} ${pkg.version}`,
                url: `http://${address}:${port}`
            });
        });
    });
};

main();
