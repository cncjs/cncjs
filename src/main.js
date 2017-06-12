/* eslint import/no-unresolved: 0 */
import { app } from 'electron';
import mkdirp from 'mkdirp';
import { WindowManager, handleStartupEvent, setApplicationMenu } from './desktop';
import cnc from './cnc';
import pkg from './package.json';

let windowManager = null;

const main = () => {
    if (handleStartupEvent()) {
        return;
    }

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
        cnc({ host: '127.0.0.1', port: 0 }, (err, server) => {
            if (err) {
                console.error('Error:', err);
                return;
            }

            const address = server.address();
            if (!address) {
                console.error('Unable to start the server:', address);
                return;
            }

            setApplicationMenu();

            windowManager = new WindowManager();
            windowManager.openWindow({
                title: `${pkg.name} ${pkg.version}`,
                url: `http://${address.address}:${address.port}`
            });
        });
    });
};

main();
