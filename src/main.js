import 'babel-polyfill';
import { app, Menu } from 'electron';
import ElectronConfig from 'electron-config';
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

    const config = new ElectronConfig();

    // Create the user data directory if it does not exist
    const userData = app.getPath('userData');
    mkdirp.sync(userData);

    app.on('ready', async () => {
        try {
            const data = await cnc();

            const { address, port, routes } = { ...data };
            if (!(address && port)) {
                console.error('Unable to start the server at ' + chalk.cyan(`http://${address}:${port}`));
                return;
            }

            const menu = Menu.buildFromTemplate(menuTemplate({ address, port, routes }));
            Menu.setApplicationMenu(menu);

            windowManager = new WindowManager();

            const url = `http://${address}:${port}`;
            // The bounds is a rectangle object with the following properties:
            // * `x` Number - The x coordinate of the origin of the rectangle.
            // * `y` Number - The y coordinate of the origin of the rectangle.
            // * `width` Number - The width of the rectangle.
            // * `height` Number - The height of the rectangle.
            const bounds = {
                width: 1280, // Defaults to 1280
                height: 768, // Defaults to 768
                ...config.get('bounds')
            };
            const options = {
                ...bounds,
                title: `${pkg.name} ${pkg.version}`
            };
            const win = windowManager.openWindow(url, options);

            // Save window size and position
            win.on('close', () => {
                config.set('bounds', win.getBounds());
            });
        } catch (err) {
            console.error('Error:', err);
        }
    });
};

main();
