import fs from 'node:fs';
import path from 'node:path';
import {
  BrowserWindow,
  Menu,
  app,
  ipcMain,
  powerSaveBlocker,
  screen,
  shell,
} from 'electron';
import Store from 'electron-store';
import chalk from 'chalk';
import mkdirp from 'mkdirp';
import {
  createApplicationMenuTemplate,
  inputMenuTemplate,
  selectionMenuTemplate,
} from './electron-app/menu-template';
import launchServer from './server-cli';
import pkg from './package.json';

let mainWindow = null;
let powerId = 0;
const store = new Store();

// https://github.com/electron/electron/blob/master/docs/api/app.md#apprequestsingleinstancelock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
const shouldQuitImmediately = !gotSingleInstanceLock;
if (shouldQuitImmediately) {
  app.quit();
  process.exit(0);
}

// Create the user data directory if it does not exist
const userDataPath = app.getPath('userData');
mkdirp.sync(userDataPath);

function getBrowserWindowOptions() {
  const defaultOptions = {
    width: 1440,
    height: 900,
    minHeight: 708,
    minWidth: 1024,
    show: false,
    title: `${pkg.name} ${pkg.version}`,

    // useContentSize boolean (optional) - The width and height would be used as web page's size, which means the actual window's size will include window frame's size and be slightly larger. Default is false.
    useContentSize: true,

    // webPreferences Object (optional) - Settings of web page's features.
    webPreferences: {
      // https://www.electronjs.org/docs/latest/breaking-changes#default-changed-contextisolation-defaults-to-true
      // require() cannot be used in the renderer process unless nodeIntegration is true and contextIsolation is false.
      contextIsolation: false,
      nodeIntegration: true,
    }
  };

  // { x, y, width, height }
  const lastOptions = store.get('bounds');

  // Get display that most closely intersects the provided bounds
  let windowOptions = {};
  if (lastOptions) {
    const display = screen.getDisplayMatching(lastOptions);

    if (display.id === lastOptions.id) {
      // Use last time options when using the same display
      windowOptions = {
        ...windowOptions,
        ...lastOptions,
      };
    } else {
      // Or center the window when using other display
      const workArea = display.workArea;

      // Calculate window size
      const width = Math.max(Math.min(lastOptions.width, workArea.width), 360);
      const height = Math.max(Math.min(lastOptions.height, workArea.height), 240);
      const x = workArea.x + (workArea.width - width) / 2;
      const y = workArea.y + (workArea.height - height) / 2;

      windowOptions = {
        id: display.id,
        x,
        y,
        width,
        height,
      };
    }
  } else {
    const display = screen.getPrimaryDisplay();
    const { x, y, width } = display.workArea;
    const nx = x + (width - 1440) / 2;
    windowOptions = {
      id: display.id,
      x: nx,
      y,
      center: true,
    };
  }

  return Object.assign({}, defaultOptions, windowOptions);
}

const showMainWindow = async () => {
  const browserWindowOptions = getBrowserWindowOptions();
  const browserWindow = new BrowserWindow(browserWindowOptions);
  mainWindow = browserWindow;
  powerId = powerSaveBlocker.start('prevent-display-sleep');

  const res = await launchServer();
  const { address, port, mountPoints } = { ...res };
  if (!(address && port)) {
    console.error('Unable to start the server at ' + chalk.cyan(`http://${address}:${port}`));
    return;
  }

  const applicationMenu = Menu.buildFromTemplate(createApplicationMenuTemplate({ address, port, mountPoints }));
  const inputMenu = Menu.buildFromTemplate(inputMenuTemplate);
  const selectionMenu = Menu.buildFromTemplate(selectionMenuTemplate);
  Menu.setApplicationMenu(applicationMenu);

  // https://www.electronjs.org/docs/latest/api/web-contents#contentssetwindowopenhandlerhandler
  // https://github.com/electron/electron/pull/24517
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // https://github.com/electron/electron/blob/main/docs/api/web-contents.md#event-context-menu
  // https://github.com/electron/electron/issues/4068#issuecomment-274159726
  mainWindow.webContents.on('context-menu', (event, props) => {
    const { selectionText, isEditable } = props;
    if (isEditable) {
      inputMenu.popup(mainWindow);
    } else if (selectionText && String(selectionText).trim() !== '') {
      selectionMenu.popup(mainWindow);
    }
  });

  const webContentsSession = mainWindow.webContents.session;
  webContentsSession.setProxy({ proxyRules: 'direct://' })
    .then(() => {
      const url = `http://${address}:${port}`;
      mainWindow.loadURL(url);
    })
    .catch(err => {
      console.log('err', err.message);
    });

  if (process.platform === 'win32') {
    mainWindow.show();
  } else {
    mainWindow.on('ready-to-show', () => {
      mainWindow.show();
    });
  }

  // Save window size and position
  mainWindow.on('close', (event) => {
    const bounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const options = {
      id: display.id,
      ...bounds,
    };

    store.set('bounds', options);
    mainWindow.webContents.send('save-and-close');

    mainWindow = null;
  });

  // @see 'src/app/store/index.js'
  ipcMain.handle('read-user-config', () => {
    let content = '{}';
    const configPath = path.join(userDataPath, 'cnc.json');
    if (fs.existsSync(configPath)) {
      content = fs.readFileSync(configPath, 'utf8');
    }
    return content;
  });

  // @see 'src/app/store/index.js'
  ipcMain.handle('write-user-config', (event, content) => {
    const configPath = path.join(userDataPath, 'cnc.json');
    fs.writeFileSync(configPath, content ?? '{}');
  });
};

// Increase V8 heap size of the main process in production
if (process.arch === 'x64') {
  const memoryLimit = 1024 * 4; // 4GB
  app.commandLine.appendSwitch('--js-flags', `--max-old-space-size=${memoryLimit}`);
}

// Ignore the GPU blacklist and use any available GPU
app.commandLine.appendSwitch('ignore-gpu-blacklist');

if (process.platform === 'linux') {
  // https://github.com/electron/electron/issues/18265
  // Run this at early startup, before app.on('ready')
  //
  // TODO: Maybe we can only disable --disable-setuid-sandbox
  // reference changes: https://github.com/microsoft/vscode/pull/122909/files
  app.commandLine.appendSwitch('--no-sandbox');
}

/**
 * https://www.electronjs.org/docs/latest/api/app#event-activate-macos
 *
 * Event: 'activate' [macOS]
 *
 * Returns:
 * - `event` Event
 * - `hasVisibleWindows` boolean
 *
 * Emitted when the application is activated. Various actions can trigger this event, such as launching the application for the first time, attempting to re-launch the application when it's already running, or clicking on the application's dock or taskbar icon.
 */
app.on('activate', async (event, hasVisibleWindows) => {
  if (!mainWindow) {
    await showMainWindow();
  }
});

/**
 * https://www.electronjs.org/docs/latest/api/app#event-window-all-closed
 *
 * Event: 'window-all-closed'
 *
 * Emitted when all windows have been closed.
 *
 * If you do not subscribe to this event and all windows are closed, the default behavior is to quit the app; however, if you subscribe, you control whether the app quits or not. If the user pressed `Cmd + Q`, or the developer called `app.quit()`, Electron will first try to close all the windows and then emit the `will-quit` event, and in this case the `window-all-closed` event would not be emitted.
 */
app.on('window-all-closed', () => {
  powerSaveBlocker.stop(powerId);

  app.quit();
});

/**
 * https://www.electronjs.org/docs/latest/api/app#event-second-instance
 *
 * Event: 'second-instance'
 *
 * Returns:
 * - `event` Event
 * - `argv` string[] - An array of the second instance's command line arguments
 * - `workingDirectory` string - The second instance's working directory
 * - `additionalData` unknown - A JSON object of additional data passed from the second instance
 *
 * This event will be emitted inside the primary instance of your application when a second instance has been executed and calls `app.requestSingleInstanceLock()`.
 *
 * `argv` is an Array of the second instance's command line arguments, and `workingDirectory` is its current working directory. Usually applications respond to this by making their primary window focused and non-minimized.
 *
 * Note: If the second instance is started by a different user than the first, the `argv` array will not include the arguments.
 *
 * This event is guaranteed to be emitted after the ready event of app gets emitted.
 */
app.on('second-instance', (event, argv, workingDirectory, additionalData) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

/**
 * Method: app.whenReady()
 *
 * Returns Promise<void> - fulfilled when Electron is initialized. May be used as a convenient alternative to checking `app.isReady()` and subscribing to the `ready` event if the app is not ready yet.
 */
app.whenReady().then(showMainWindow);
