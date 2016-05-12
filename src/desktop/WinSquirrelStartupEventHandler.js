/* eslint import/no-unresolved: 0 */
import path from 'path';
import { spawn } from 'child_process';
import { app } from 'electron';
import log from './log';

const run = (args, done) => {
    const appPath = path.resolve(process.execPath, '..');
    const rootAtomPath = path.resolve(appPath, '..');
    const updateExe = path.resolve(path.join(rootAtomPath, 'Update.exe'));

    log.debug('Spawning `%s` with args `%s`', updateExe, args);
    spawn(updateExe, args, { detached: true })
        .on('close', done);
};

// Handle Squirrel Events
// https://github.com/electron/windows-installer#handling-squirrel-events
const handleStartupEvent = () => {
    if (process.platform !== 'win32') {
        return false;
    }

    const cmd = process.argv[1];
    const exeName = path.basename(process.execPath);

    log.debug('Processing squirrel command `%s`', cmd);

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

export default handleStartupEvent;
